from django.urls import path
from .views import SearchView, FeaturedRoutesView

urlpatterns = [
    path('', SearchView.as_view(), name='search'),
    path('featured/', FeaturedRoutesView.as_view(), name='featured-routes'),
]