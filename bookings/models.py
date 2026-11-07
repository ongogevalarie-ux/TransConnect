
import uuid

from django.db import models
from django.conf import settings
from schedules.models import Schedule


class Booking(models.Model):

    BOOKING_STATUS = [
        ('PENDING', 'Pending Confirmation'),
        ('CONFIRMED', 'Confirmed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]

    booking_reference = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings'
    )

    schedule = models.ForeignKey(
        Schedule,
        on_delete=models.PROTECT,
        related_name='bookings'
    )

    passenger_name = models.CharField(max_length=150)

    passenger_email = models.EmailField()

    passenger_phone = models.CharField(max_length=20)

    seats_requested = models.PositiveIntegerField(default=1)

    status = models.CharField(
        max_length=20,
        choices=BOOKING_STATUS,
        default='PENDING'
    )

    operator_confirmation_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.booking_reference)
