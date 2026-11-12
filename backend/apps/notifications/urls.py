"""Mounted at /api/notifications/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, SettingsView

router = DefaultRouter()
router.register("log", NotificationViewSet, basename="notification")

urlpatterns = [
    path("settings/", SettingsView.as_view(), name="notification-settings"),
    path("", include(router.urls)),
]
