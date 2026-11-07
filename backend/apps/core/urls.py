"""Mounted at /api/core/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AcademicYearViewSet, SchoolView, TermViewSet

router = DefaultRouter()
router.register("years", AcademicYearViewSet)
router.register("terms", TermViewSet)

urlpatterns = [
    path("school/", SchoolView.as_view(), name="school"),
    path("", include(router.urls)),
]
