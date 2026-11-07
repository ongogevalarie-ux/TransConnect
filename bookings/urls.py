
from django.urls import path

from .views import (
    BookingListCreateView,
    BookingDetailView,
    AdminBookingListView,
    AdminBookingDetailView,
)

urlpatterns = [
    # Passenger endpoints
    path('', BookingListCreateView.as_view(), name='booking-list'),
    path('<int:pk>/', BookingDetailView.as_view(), name='booking-detail'),

    # Administrator endpoints
    path('admin/', AdminBookingListView.as_view(), name='admin-booking-list'),
    path(
        'admin/<int:pk>/',
        AdminBookingDetailView.as_view(),
        name='admin-booking-detail'
    ),
]
