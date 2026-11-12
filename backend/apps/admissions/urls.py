"""Mounted at /api/admissions/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ApplicationViewSet, PublicApplyView

router = DefaultRouter()
router.register("applications", ApplicationViewSet, basename="application")

urlpatterns = [
    path("apply/", PublicApplyView.as_view()),
    path("", include(router.urls)),
]
