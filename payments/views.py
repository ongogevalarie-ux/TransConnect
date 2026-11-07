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
            route=booking.schedule.route
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

class MpesaCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        callback_data = request.data.get("Body", {}).get("stkCallback", {})

        checkout_id = callback_data.get("CheckoutRequestID")
        result_code = callback_data.get("ResultCode")
        result_description = callback_data.get("ResultDesc", "")

        if not checkout_id or result_code is None:
            return Response(
                {"error": "Invalid M-Pesa callback data."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                payment = Payment.objects.select_for_update().get(
                    checkout_request_id=checkout_id
                )

                # Record the callback result for later verification.
                # Do not mark SUCCESS based only on this incoming message.
                payment.result_code = str(result_code)
                payment.result_description = result_description

                payment.save(
                    update_fields=[
                        "result_code",
                        "result_description",
                        "updated_at",
                    ]
                )

            return Response(
                {"message": "Callback received."},
                status=status.HTTP_200_OK,
            )

        except Payment.DoesNotExist:
            return Response(
                {"error": "Payment record not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
