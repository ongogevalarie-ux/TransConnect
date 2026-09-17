from django.db import models
from operators.models import Operator
from routes.models import Route

class Fare(models.Model):
    operator = models.ForeignKey(Operator, on_delete=models.CASCADE, related_name='fares')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='fares')
    price_ksh = models.DecimalField(max_digits=10, decimal_places=2)
    updated_at = models.DateTimeField(auto_now=True)