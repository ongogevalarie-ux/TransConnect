from django.db.models import Prefetch
from payments.models import Payment
from django.db import IntegrityError, transaction, transaction
from django.db.migrations import serializer
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from operators import serializers
from rest_framework.response import Response
from schedules.models import Schedule
from .models import SeatReservation
from .seat_utils import generate_seat_numbers
from rest_framework import generics, permissions
from .models import Booking
from .serializers import BookingSerializer
from .serializers import AdminBookingSerializer




class BookingListCreateView(generics.ListCreateAPIView):

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            user=self.request.user
        ).select_related(
            'schedule',
            'schedule__operator',
            'schedule__route'
        ).prefetch_related(
            'seat_reservations',
            Prefetch(
                'payments',
                queryset=Payment.objects.order_by('-created_at')
            )
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BookingDetailView(generics.RetrieveAPIView):

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            user=self.request.user
        ).select_related(
            'schedule',
            'schedule__operator',
            'schedule__route'
        ).prefetch_related(
            'seat_reservations',
            Prefetch(
                'payments',
                queryset=Payment.objects.order_by('-created_at')
            )
        )
class AdminBookingListView(generics.ListAPIView):

    serializer_class = AdminBookingSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Booking.objects.select_related(
            'user',
            'schedule',
            'schedule__operator',
            'schedule__route'
        ).order_by('-created_at')


class AdminBookingDetailView(generics.RetrieveUpdateAPIView):

    serializer_class = AdminBookingSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        return Booking.objects.select_related(
            'user',
            'schedule',
            'schedule__operator',
            'schedule__route'
        )
    def perform_update(self, serializer):
        booking = serializer.save()

        if booking.status in ['REJECTED', 'CANCELLED']:
            booking.seat_reservations.all().delete()

class ScheduleSeatAvailabilityView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, schedule_id):

        schedule = get_object_or_404(
            Schedule,
            id=schedule_id
        )

        occupied_seats = set(
            SeatReservation.objects.filter(
                schedule=schedule,
                booking__status__in=[
                    "PENDING",
                    "CONFIRMED"
                ]
            ).values_list("seat_number", flat=True)
        )

        all_seats = generate_seat_numbers(
            schedule.seat_capacity
        )

        seats = [
            {
                "seat_number": seat,
                "status": (
                    "OCCUPIED"
                    if seat in occupied_seats
                    else "AVAILABLE"
                )
            }
            for seat in all_seats
        ]

        return Response({
            "schedule_id": schedule.id,
            "seat_capacity": schedule.seat_capacity,
            "available_count": len(all_seats) - len(occupied_seats),
            "occupied_count": len(occupied_seats),
            "seats": seats
        })
