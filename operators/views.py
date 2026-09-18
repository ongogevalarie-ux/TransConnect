from rest_framework import viewsets
from .models import Operator
from .serializers import OperatorSerializer

class OperatorViewSet(viewsets.ModelViewSet):
    queryset = Operator.objects.all()
    serializer_class = OperatorSerializer