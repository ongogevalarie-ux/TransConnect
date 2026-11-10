import logging
from datetime import timedelta
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from bookings.models import Booking
from fares.models import Fare
from .models import Payment
from .serializers import (PaymentInitiationSerializer,AdminPaymentSerializer,)
from .services.mpesa import initiate_stk_push, normalize_phone_number
from .services.verification import verify_payment_with_safaricom

logger = logging.getLogger(__name__)

# A PENDING payment older than this is treated as abandoned, so the
# passenger can try again instead of being blocked forever.
PENDING_TIMEOUT = timedelta(minutes=2)

# What Safaricom expects back from a callback endpoint.
DARAJA_ACK = {"ResultCode": 0, "ResultDesc": "Accepted"}


class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking_id = serializer.validated_data["booking_id"]
        phone_number = serializer.validated_data["phone_number"]

        # Validate the phone number up front so the user gets a clear 400.
        try:
            phone_number = normalize_phone_number(phone_number)
        except ValueError as exc:
            return Response(
                {"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST
            )

        try:
            booking = Booking.objects.select_related(
                "schedule__route",
                "schedule__operator",
            ).get(id=booking_id, user=request.user)
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status != "CONFIRMED":
            return Response(
        {"error": "This booking must be confirmed before payment."},
        status=status.HTTP_400_BAD_REQUEST,
    )

        if Payment.objects.filter(booking=booking, status="SUCCESS").exists():
            return Response(
                {"error": "This booking has already been paid for."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        fare = Fare.objects.filter(
            route=booking.schedule.route,
            operator=booking.schedule.operator,
        ).first()

        if fare is None:
            return Response(
                {"error": "No fare is available for this journey."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        amount = fare.price_ksh * booking.seats_requested

        if amount <= 0:
            return Response(
                {"error": "Invalid booking amount."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---- Handle an existing PENDING payment -------------------------
        existing_payment = Payment.objects.filter(
            booking=booking, status="PENDING"
        ).first()

        if existing_payment:
            age = timezone.now() - existing_payment.updated_at

            if age < PENDING_TIMEOUT:
                return Response(
                    {
                        "message": "A payment is already pending.",
                        "payment_id": existing_payment.id,
                        "status": existing_payment.status,
                        "checkout_request_id": existing_payment.checkout_request_id,
                    },
                    status=status.HTTP_200_OK,
                )

            # Stale. Before expiring it, check once whether the customer
            # actually paid (callback may simply have been delayed).
            if existing_payment.checkout_request_id:
                try:
                    verify_payment_with_safaricom(existing_payment)
                    existing_payment.refresh_from_db()
                except Exception:
                    logger.warning(
                        "Could not verify stale payment %s", existing_payment.id
                    )

            if existing_payment.status == "SUCCESS":
                return Response(
                    {
                        "message": "This booking has already been paid for.",
                        "payment_id": existing_payment.id,
                        "status": existing_payment.status,
                    },
                    status=status.HTTP_200_OK,
                )

            if existing_payment.status == "PENDING":
                existing_payment.status = "FAILED"
                existing_payment.result_description = (
                    "Expired without confirmation."
                )
                existing_payment.save(
                    update_fields=["status", "result_description", "updated_at"]
                )

        # ---- Create the payment and send the STK push -------------------
        payment = Payment.objects.create(
            booking=booking,
            amount=amount,
            phone_number=phone_number,
            status="PENDING",
        )

        try:
            mpesa_response = initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=payment.id,
            )
        except ValueError as exc:
            # Our own validation / Safaricom rejection / rate limit message.
            logger.warning("STK push rejected for payment %s: %s", payment.id, exc)
            payment.status = "FAILED"
            payment.result_description = str(exc)[:255]
            payment.save(update_fields=["status", "result_description", "updated_at"])
            return Response(
                {
                    "error": str(exc)
                    if settings.DEBUG
                    else "Unable to initiate payment. Please try again later."
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("STK push failed for payment %s", payment.id)
            payment.status = "FAILED"
            payment.save(update_fields=["status", "updated_at"])
            return Response(
                {"error": "Unable to initiate payment. Please try again later."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        payment.merchant_request_id = mpesa_response.get("MerchantRequestID")
        payment.checkout_request_id = mpesa_response.get("CheckoutRequestID")
        payment.result_description = mpesa_response.get("CustomerMessage", "")
        payment.save()

        return Response(
            {
                "message": "STK Push request accepted. Check your phone.",
                "payment_id": payment.id,
                "amount": str(payment.amount),
                "status": payment.status,
                "checkout_request_id": payment.checkout_request_id,
            },
            status=status.HTTP_200_OK,
        )


class MpesaCallbackView(APIView):
    """Receives the result Safaricom posts after the customer acts on the prompt.

    Always answers 200 with the standard acknowledgement. Safaricom does not
    use our response for anything else, and error codes only cause noise.
    The authoritative check is the STK Query done in verification.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        logger.info("M-Pesa callback received: %s", request.data)

        callback_data = request.data.get("Body", {}).get("stkCallback", {})

        checkout_id = callback_data.get("CheckoutRequestID")
        merchant_id = callback_data.get("MerchantRequestID")
        result_code = callback_data.get("ResultCode")
        result_description = callback_data.get("ResultDesc", "")

        if not checkout_id or result_code is None:
            logger.warning("Invalid callback payload.")
            return Response(DARAJA_ACK, status=status.HTTP_200_OK)

        with transaction.atomic():
            try:
                payment = Payment.objects.select_for_update().get(
                    checkout_request_id=checkout_id
                )
            except Payment.DoesNotExist:
                logger.warning("Callback for unknown checkout id %s", checkout_id)
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            if payment.safaricom_verified or payment.status == "SUCCESS":
                # Already confirmed via the STK Query. If the callback only
                # arrives now, still record the M-Pesa receipt number.
                if str(result_code) == "0" and not payment.mpesa_receipt_number:
                    late_items = callback_data.get("CallbackMetadata", {}).get(
                        "Item", []
                    )
                    late_meta = {i.get("Name"): i.get("Value") for i in late_items}
                    late_receipt = late_meta.get("MpesaReceiptNumber")
                    if late_receipt:
                        payment.mpesa_receipt_number = str(late_receipt)
                        payment.save(
                            update_fields=["mpesa_receipt_number", "updated_at"]
                        )
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            if (
                payment.merchant_request_id
                and merchant_id != payment.merchant_request_id
            ):
                logger.warning("MerchantRequestID mismatch on %s", payment.id)
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            payment.result_code = str(result_code)
            payment.result_description = result_description

            # ---- Failed / cancelled / timed out ------------------------
            if str(result_code) != "0":
                payment.status = "FAILED"
                payment.save()
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            # ---- Success: read the metadata ---------------------------
            items = callback_data.get("CallbackMetadata", {}).get("Item", [])
            metadata = {item.get("Name"): item.get("Value") for item in items}

            callback_amount = metadata.get("Amount")
            callback_receipt = metadata.get("MpesaReceiptNumber")
            callback_phone = metadata.get("PhoneNumber")

            if callback_amount is None or not callback_receipt:
                logger.warning("Incomplete metadata on payment %s", payment.id)
                payment.save()
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            try:
                amount_matches = Decimal(str(callback_amount)) == payment.amount
            except InvalidOperation:
                amount_matches = False

            if not amount_matches:
                logger.warning("Amount mismatch on payment %s", payment.id)
                payment.save()
                return Response(DARAJA_ACK, status=status.HTTP_200_OK)

            # The phone number is only logged, not enforced. Safaricom may
            # mask or change it (and the sandbox uses its own test number),
            # so a strict match would reject genuine payments. The STK Query
            # below is the real proof of payment.
            try:
                if callback_phone is not None and (
                    normalize_phone_number(callback_phone)
                    != normalize_phone_number(payment.phone_number)
                ):
                    logger.info("Callback phone differs on payment %s", payment.id)
            except ValueError:
                pass

            payment.mpesa_receipt_number = str(callback_receipt)
            payment.save()

        # Verify with Safaricom outside the DB transaction.
        try:
            verify_payment_with_safaricom(payment)
        except Exception:
            logger.exception(
                "Verification pending for payment %s; will be retried.", payment.id
            )

        return Response(DARAJA_ACK, status=status.HTTP_200_OK)


def build_provisional_ticket(payment):
    booking = payment.booking
    schedule = booking.schedule
    route = schedule.route
    operator = schedule.operator

    return {
        "ticket_number": str(booking.booking_reference),
        "ticket_status": "PROVISIONAL",
        "booking_status": booking.status,
        "passenger_name": booking.passenger_name,
        "passenger_email": booking.passenger_email,
        "operator": operator.name,
        "origin": route.origin,
        "destination": route.destination,
        "departure_time": schedule.departure_time.strftime("%H:%M"),
        "arrival_time": schedule.arrival_time.strftime("%H:%M"),
        "seats": booking.seats_requested,
        "amount_paid": str(payment.amount),
        "mpesa_receipt_number": payment.mpesa_receipt_number,
        "payment_status": payment.status,
        "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
    }


class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, payment_id):
        payment = get_object_or_404(
            Payment.objects.select_related(
                "booking",
                "booking__schedule",
                "booking__schedule__route",
                "booking__schedule__operator",
            ),
            id=payment_id,
            booking__user=request.user,
        )

        message = "This payment has already been processed."

        # Only ask Safaricom while still undecided. A FAILED or SUCCESS
        # payment does not need another query (this also avoids 429s when
        # the frontend keeps polling).
        if payment.status == "PENDING" and not payment.safaricom_verified:
            try:
                _verified, message = verify_payment_with_safaricom(payment)
                payment.refresh_from_db()
            except Exception:
                logger.exception("Verification failed for payment %s", payment.id)
                return Response(
                    {
                        "payment_id": payment.id,
                        "status": payment.status,
                        "verified": False,
                        "successful": False,
                        "message": (
                            "Unable to verify with Safaricom right now. "
                            "Your payment has not been marked successful."
                        ),
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        response_data = {
            "payment_id": payment.id,
            "status": payment.status,
            "verified": payment.safaricom_verified,
            "successful": payment.status == "SUCCESS",
            "message": message,
        }

        if payment.status == "SUCCESS" and payment.safaricom_verified:
            response_data["ticket"] = build_provisional_ticket(payment)

        return Response(response_data, status=status.HTTP_200_OK)

class RetrieveTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, booking_id):
        payment = Payment.objects.select_related(
            "booking",
            "booking__schedule",
            "booking__schedule__route",
            "booking__schedule__operator",
        ).filter(
            booking_id=booking_id,
            booking__user=request.user,
            status="SUCCESS",
            safaricom_verified=True,
        ).order_by("-created_at").first()

        if payment is None:
            return Response(
                {
                    "error": (
                        "No verified successful payment was found "
                        "for this booking."
                    )
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        ticket = build_provisional_ticket(payment)

        ticket["selected_seats"] = list(
            payment.booking.seat_reservations.values_list(
                "seat_number",
                flat=True,
            )
        )

        ticket["booking_reference"] = (
            payment.booking.booking_reference
        )

        return Response(
            {
                "ticket": ticket,
                "message": "Verified ticket retrieved successfully.",
            },
            status=status.HTTP_200_OK,
        )

class AdminPaymentMonitoringView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        payments = Payment.objects.select_related(
            "booking",
            "booking__user",
        ).order_by("-created_at")

        serializer = AdminPaymentSerializer(
            payments,
            many=True
        )

        return Response(
            {
                "count": payments.count(),
                "results": serializer.data,
            },
            status=status.HTTP_200_OK
        )  