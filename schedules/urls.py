from rest_framework.routers import DefaultRouter
from .views import ScheduleViewSet

router = DefaultRouter()
router.register(r'', ScheduleViewSet)

urlpatterns = router.urls