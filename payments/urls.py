from django.urls import path

from .views import (
    InitiatePaymentView,
    MpesaCallbackView,
    VerifyPaymentView,
)

urlpatterns = [
    path("initiate/", InitiatePaymentView.as_view(), name="initiate-payment"),
    path("callback/", MpesaCallbackView.as_view(), name="mpesa-callback"),
    path(
        "<int:payment_id>/verify/",
        VerifyPaymentView.as_view(),
        name="verify-payment",
    ),
]