from django.contrib import admin
from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'booking',
        'amount',
        'phone_number',
        'status',
        'mpesa_receipt_number',
        'created_at',
    )

    list_filter = ('status', 'created_at')

    search_fields = (
        'phone_number',
        'mpesa_receipt_number',
        'checkout_request_id',
    )

    readonly_fields = (
        'created_at',
        'updated_at',
        'paid_at',
    )