
from rest_framework import serializers
from .models import Booking


class BookingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_reference',
            'schedule',
            'passenger_name',
            'passenger_email',
            'passenger_phone',
            'seats_requested',
            'status',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'booking_reference',
            'status',
            'created_at',
        ]

    def validate_seats_requested(self, value):
        if value < 1:
            raise serializers.ValidationError(
                "At least one seat must be requested."
            )
        return value
    
class AdminBookingSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source='user.username',
        read_only=True
    )

    operator = serializers.CharField(
        source='schedule.operator.name',
        read_only=True
    )

    route = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_reference',
            'username',
            'passenger_name',
            'passenger_email',
            'passenger_phone',
            'operator',
            'route',
            'schedule',
            'seats_requested',
            'status',
            'operator_confirmation_reference',
            'created_at',
        ]

        read_only_fields = [
            'id',
            'booking_reference',
            'username',
            'passenger_name',
            'passenger_email',
            'passenger_phone',
            'operator',
            'route',
            'schedule',
            'seats_requested',
            'created_at',
        ]

    def get_route(self, obj):
        route = obj.schedule.route
        return f'{route.origin} → {route.destination}'

    
