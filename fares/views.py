from rest_framework import viewsets
from .models import Fare
from .serializers import FareSerializer


class FareViewSet(viewsets.ModelViewSet):
    queryset = Fare.objects.all()
    serializer_class = FareSerializer