from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView


class RegisterView(APIView):

    def post(self, request):

        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')

        if not username or not email or not password:
            return Response(
                {
                    'error': 'Username, email and password are required.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {
                    'error': 'Username already exists.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {
                    'error': 'Email already exists.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        return Response(
            {
                'message': 'Account created successfully.',
                'username': user.username
            },
            status=status.HTTP_201_CREATED
        )