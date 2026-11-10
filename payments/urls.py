from django.urls import path

from .views import (
    InitiatePaymentView,
    MpesaCallbackView,
    VerifyPaymentView,
    RetrieveTicketView,
    AdminPaymentMonitoringView,
)

urlpatterns = [
    path(
        "initiate/",
        InitiatePaymentView.as_view(),
        name="initiate-payment",
    ),
    path(
        "callback/",
        MpesaCallbackView.as_view(),
        name="mpesa-callback",
    ),
    path(
        "<int:payment_id>/verify/",
        VerifyPaymentView.as_view(),
        name="verify-payment",
    ),
    path(
        "bookings/<int:booking_id>/ticket/",
        RetrieveTicketView.as_view(),
        name="retrieve-ticket",
    ),
    path(
        "admin/",
        AdminPaymentMonitoringView.as_view(),
        name="admin-payment-monitoring",
    ),
]