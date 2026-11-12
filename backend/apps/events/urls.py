"""Mounted at /api/events/"""
from rest_framework.routers import DefaultRouter

from .views import AnnouncementViewSet, EventViewSet

router = DefaultRouter()
router.register("events", EventViewSet, basename="event")
router.register("announcements", AnnouncementViewSet, basename="announcement")

urlpatterns = router.urls
