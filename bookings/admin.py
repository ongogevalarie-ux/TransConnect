from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    list_display = (
        'booking_reference',
        'passenger_name',
        'passenger_phone',
        'schedule',
        'seats_requested',
        'status',
        'created_at',
    )

    list_filter = ('status', 'created_at')

    search_fields = (
        'passenger_name',
        'passenger_email',
        'passenger_phone',
        'booking_reference',
    )

    readonly_fields = (
        'booking_reference',
        'created_at',
        'updated_at',
    )