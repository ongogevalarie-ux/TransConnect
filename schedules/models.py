from django.db import models
from operators.models import Operator
from routes.models import Route

class Schedule(models.Model):
    operator = models.ForeignKey(Operator, on_delete=models.CASCADE, related_name='schedules')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='schedules')
    departure_time = models.TimeField()
    arrival_time = models.TimeField()