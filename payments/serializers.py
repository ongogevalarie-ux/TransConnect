from rest_framework import serializers
from .models import Payment


class PaymentInitiationSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=15)


class AdminPaymentSerializer(serializers.ModelSerializer):
    payment_reference = serializers.SerializerMethodField()
    passenger = serializers.CharField(
        source="booking.passenger_name",
        read_only=True
    )
    booking_reference = serializers.CharField(
        source="booking.booking_reference",
        read_only=True
    )
    verification_status = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = [
            "id",
            "payment_reference",
            "booking_reference",
            "passenger",
            "amount",
            "mpesa_receipt_number",
            "status",
            "verification_status",
            "safaricom_verified",
            "verified_at",
            "created_at",
        ]
        read_only_fields = fields

    def get_payment_reference(self, obj):
        return obj.checkout_request_id or f"PAY-{obj.id}"

    def get_verification_status(self, obj):
        return "VERIFIED" if obj.safaricom_verified else "NOT VERIFIED"