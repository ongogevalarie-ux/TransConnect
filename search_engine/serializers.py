from rest_framework import serializers


class SearchResultSerializer(serializers.Serializer):
    operator = serializers.CharField()
    route = serializers.CharField()
    fare = serializers.DecimalField(max_digits=10, decimal_places=2)
    departure_time = serializers.TimeField()
    arrival_time = serializers.TimeField()
    booking_url = serializers.URLField()