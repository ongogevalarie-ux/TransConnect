from decimal import Decimal, InvalidOperation

from rest_framework.permissions import AllowAny
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions

from bookings.models import Booking
from fares.models import Fare
from .models import Payment
from .serializers import PaymentInitiationSerializer
from .services.mpesa import initiate_stk_push
from .services.verification import verify_payment_with_safaricom
from .services.mpesa import normalize_phone_number
from django.shortcuts import get_object_or_404
from django.utils import timezone

class InitiatePaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        booking_id = serializer.validated_data["booking_id"]
        phone_number = serializer.validated_data["phone_number"]

        try:
            booking = Booking.objects.select_related(
                "schedule__route",
                "schedule__operator",
            ).get(
                id=booking_id,
                user=request.user,
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": "Booking not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status != "CONFIRMED":
            return Response(
                {
                    "error": (
                        "Your booking must be confirmed by the "
                        "transport operator before payment."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        fare = Fare.objects.filter(
    route=booking.schedule.route,
    operator=booking.schedule.operator).first()

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

        try:
            with transaction.atomic():
                payment = Payment.objects.create(
                    booking=booking,
                    amount=amount,
                    phone_number=phone_number,
                    status="PENDING",
                )

            mpesa_response = initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=payment.id,
            )

            payment.merchant_request_id = (
                mpesa_response.get("MerchantRequestID")
            )
            payment.checkout_request_id = (
                mpesa_response.get("CheckoutRequestID")
            )
            payment.result_description = (
                mpesa_response.get("CustomerMessage", "")
            )
            payment.save()

            if mpesa_response.get("ResponseCode") != "0":
                payment.status = "FAILED"
                payment.save(update_fields=["status", "updated_at"])

                return Response(
                    {"error": "Safaricom did not accept the payment request."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

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

        except Exception:
            if "payment" in locals():
                payment.status = "FAILED"
                payment.save(update_fields=["status", "updated_at"])

            return Response(
                {
                    "error": (
                        "Unable to initiate payment. "
                        "Please try again later."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        existing_payment = Payment.objects.filter(booking=booking, status="PENDING").first()

        if existing_payment:
            return Response(
        {
            "error": "A payment is already pending for this booking.",
            "payment_id": existing_payment.id,
        },
        status=400
    )

class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        callback_data = (
            request.data.get("Body", {}).get("stkCallback", {})
        )

        checkout_id = callback_data.get("CheckoutRequestID")
        merchant_id = callback_data.get("MerchantRequestID")
        result_code = callback_data.get("ResultCode")
        result_description = callback_data.get("ResultDesc", "")

        if not checkout_id or result_code is None:
            return Response(
                {"error": "Invalid callback data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                payment = (
                    Payment.objects.select_for_update()
                    .get(checkout_request_id=checkout_id)
                )

                if payment.safaricom_verified:
                    return Response(
                        {"message": "Payment was already processed."},
                        status=status.HTTP_200_OK,
                    )

                if (
                    payment.merchant_request_id
                    and merchant_id != payment.merchant_request_id
                ):
                    return Response(
                        {"error": "MerchantRequestID mismatch."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                payment.result_code = str(result_code)
                payment.result_description = result_description

                # Successful callbacks contain payment metadata.
                if str(result_code) == "0":
                    items = (
                        callback_data.get("CallbackMetadata", {})
                        .get("Item", [])
                    )

                    metadata = {
                        item.get("Name"): item.get("Value")
                        for item in items
                    }

                    callback_amount = metadata.get("Amount")
                    callback_receipt = metadata.get("MpesaReceiptNumber")
                    callback_phone = metadata.get("PhoneNumber")

                    if (
                        callback_amount is None
                        or not callback_receipt
                        or callback_phone is None
                    ):
                        return Response(
                            {"error": "Payment metadata is incomplete."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    try:
                        amount_matches = (
                            Decimal(str(callback_amount))
                            == payment.amount
                        )

                        phone_matches = (
                            normalize_phone_number(callback_phone)
                            == normalize_phone_number(payment.phone_number)
                        )
                    except (InvalidOperation, ValueError):
                        return Response(
                            {"error": "Invalid payment metadata."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    if not amount_matches or not phone_matches:
                        return Response(
                            {"error": "Payment amount or phone mismatch."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

                    payment.mpesa_receipt_number = str(callback_receipt)

                payment.save()

            # Query Safaricom outside the database transaction.
            try:
                verified, message = verify_payment_with_safaricom(payment)
            except Exception:
                # Keep the payment pending if Safaricom is unavailable.
                verified = False
                message = "Callback saved. Safaricom verification is pending."

            return Response(
                {
                    "message": message,
                    "verified": verified,
                },
                status=status.HTTP_200_OK,
            )

        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
class VerifyPaymentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, payment_id):
        payment = get_object_or_404(
            Payment,
            id=payment_id,
            booking__user=request.user,
        )

        if payment.safaricom_verified:
            return Response({
                "payment_id": payment.id,
                "status": payment.status,
                "verified": True,
                "message": "This payment has already been processed.",
            })

        try:
            verified, message = verify_payment_with_safaricom(payment)

            payment.refresh_from_db()

            return Response({
                "payment_id": payment.id,
                "status": payment.status,
                "verified": payment.safaricom_verified,
                "message": message,
            })

        except Exception:
            return Response(
                {
                    "payment_id": payment.id,
                    "status": payment.status,
                    "verified": False,
                    "message": (
                        "Unable to verify with Safaricom right now. "
                        "The payment has not been marked successful."
                    ),
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )
        