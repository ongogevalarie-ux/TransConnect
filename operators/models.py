from django.db import models

class Operator(models.Model):
    STATUS_CHOICES = [('active', 'Active'), ('pending', 'Pending')]
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    contact = models.CharField(max_length=100)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    booking_url = models.URLField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return self.name