from rest_framework.routers import DefaultRouter
from .views import FareViewSet


router = DefaultRouter()
router.register(r'', FareViewSet)

urlpatterns = router.urls