
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
        ).select_related('schedule', 'schedule__operator')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BookingDetailView(generics.RetrieveAPIView):

    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            user=self.request.user
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
