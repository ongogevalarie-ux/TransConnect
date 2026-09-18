from rest_framework.routers import DefaultRouter
from .views import RouteViewSet

router = DefaultRouter()
router.register(r'', RouteViewSet)

urlpatterns = router.urls