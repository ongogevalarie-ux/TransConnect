
from django.db import transaction, IntegrityError
from rest_framework import serializers

from .models import Booking, SeatReservation
from .seat_utils import generate_seat_numbers
from fares.models import Fare


class BookingSerializer(serializers.ModelSerializer):
    selected_seats = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    operator = serializers.SerializerMethodField()
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()
    departure_time = serializers.SerializerMethodField()
    arrival_time = serializers.SerializerMethodField()

    fare_per_seat = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    seat_numbers = serializers.ListField(
        child=serializers.CharField(max_length=10),
        write_only=True,
        required=True
    )

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
            'seat_numbers',
            'selected_seats',
            'operator',
            'origin',
            'destination',
            'departure_time',
            'arrival_time',
            'fare_per_seat',
            'total_amount',
            'status',
            'created_at',
            'payment_status',
        ]

        read_only_fields = [
            'id',
            'booking_reference',
            'status',
            'created_at',
            'selected_seats',
            'operator',
            'origin',
            'destination',
            'departure_time',
            'arrival_time',
            'fare_per_seat',
            'total_amount',
        ]
    def get_payment_status(self, obj):
        payments = list(obj.payments.all())

        if payments:
            return payments[0].status

        return 'NOT PAID'
    def create(self, validated_data):
        seat_numbers = validated_data.pop("seat_numbers")

        try:
            with transaction.atomic():
                booking = Booking.objects.create(**validated_data)

                SeatReservation.objects.bulk_create([
                    SeatReservation(
                        booking=booking,
                        schedule=booking.schedule,
                        seat_number=seat
                    )
                    for seat in seat_numbers
                ])

            return booking

        except IntegrityError:
            raise serializers.ValidationError({
                "seat_numbers": (
                    "One or more selected seats have already been reserved. "
                    "Please refresh availability and try again."
                )
            })

    def get_selected_seats(self, obj):
        return list(
            obj.seat_reservations.values_list(
                'seat_number',
                flat=True
            )
        )

    def get_operator(self, obj):
        return obj.schedule.operator.name

    def get_origin(self, obj):
        return obj.schedule.route.origin

    def get_destination(self, obj):
        return obj.schedule.route.destination

    def get_departure_time(self, obj):
        return obj.schedule.departure_time.strftime("%H:%M")

    def get_arrival_time(self, obj):
        return obj.schedule.arrival_time.strftime("%H:%M")

    def get_fare_per_seat(self, obj):
        fare = Fare.objects.filter(
            route=obj.schedule.route,
            operator=obj.schedule.operator
        ).first()

        return str(fare.price_ksh) if fare else None

    def get_total_amount(self, obj):
        fare = Fare.objects.filter(
            route=obj.schedule.route,
            operator=obj.schedule.operator
        ).first()

        if fare is None:
            return None

        return str(fare.price_ksh * obj.seats_requested)

    def validate(self, attrs):
        schedule = attrs['schedule']
        seat_numbers = attrs.get('seat_numbers', [])
        seats_requested = attrs.get('seats_requested', 1)

        if len(seat_numbers) != seats_requested:
            raise serializers.ValidationError({
                'seat_numbers':
                    'The number of selected seats must match seats requested.'
            })

        if len(set(seat_numbers)) != len(seat_numbers):
            raise serializers.ValidationError({
                'seat_numbers': 'You cannot select the same seat twice.'
            })

        valid_seats = set(
            generate_seat_numbers(schedule.seat_capacity)
        )

        invalid_seats = [
            seat for seat in seat_numbers
            if seat not in valid_seats
        ]

        if invalid_seats:
            raise serializers.ValidationError({
                'seat_numbers': f'Invalid seats: {invalid_seats}'
            })

        occupied_seats = set(
            SeatReservation.objects.filter(
                schedule=schedule
            ).values_list('seat_number', flat=True)
        )

        unavailable = [
            seat for seat in seat_numbers
            if seat in occupied_seats
        ]

        if unavailable:
            raise serializers.ValidationError({
                'seat_numbers':
                    f'These seats are no longer available: {unavailable}'
            })

        return attrs


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
