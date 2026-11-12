"""Mounted at /api/core/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AcademicYearViewSet, SchoolLogoView, SchoolView, TermViewSet, UserViewSet

router = DefaultRouter()
router.register("years", AcademicYearViewSet)
router.register("terms", TermViewSet)
router.register("users", UserViewSet, basename="user")

urlpatterns = [
    path("school/", SchoolView.as_view(), name="school"),
    path("school/logo/", SchoolLogoView.as_view(), name="school-logo"),
    path("", include(router.urls)),
]
