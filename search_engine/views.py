from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from routes.models import Route
from fares.models import Fare
from schedules.models import Schedule


class SearchView(APIView):

    def get(self, request):

        origin = request.query_params.get('origin')
        destination = request.query_params.get('destination')

        if not origin or not destination:
            return Response(
                {
                    'error': 'Please provide both origin and destination.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        routes = Route.objects.filter(
            origin__iexact=origin,
            destination__iexact=destination
        )

        results = []

        for route in routes:

            schedules = Schedule.objects.filter(route=route)

            fares = Fare.objects.filter(route=route)

            for schedule in schedules:

                fare = fares.first()

                if not fare:
                    continue

                results.append({
                    'operator': schedule.operator.name,
                    'route': f'{route.origin} → {route.destination}',
                    'fare': fare.price_ksh,
                    'departure_time': schedule.departure_time,
                    'arrival_time': schedule.arrival_time,
                    'booking_url': schedule.operator.booking_url,
                })

        return Response(results)