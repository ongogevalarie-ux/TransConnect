from rest_framework import serializers


class PaymentInitiationSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField()
    phone_number = serializers.CharField(max_length=15)