"""Mounted at /api/students/"""
from rest_framework.routers import DefaultRouter

from .views import EnrolmentViewSet, GuardianViewSet, SchoolClassViewSet, StudentViewSet

router = DefaultRouter()
router.register("classes", SchoolClassViewSet, basename="class")
router.register("guardians", GuardianViewSet)
router.register("students", StudentViewSet, basename="student")
router.register("enrolments", EnrolmentViewSet, basename="enrolment")

urlpatterns = router.urls
