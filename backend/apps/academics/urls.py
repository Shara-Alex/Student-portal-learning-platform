"""Mounted at /api/academics/"""
from rest_framework.routers import DefaultRouter

from .views import PeriodViewSet, SubjectViewSet, TeachingAssignmentViewSet, TimetableEntryViewSet

router = DefaultRouter()
router.register("subjects", SubjectViewSet)
router.register("assignments", TeachingAssignmentViewSet, basename="assignment")
router.register("periods", PeriodViewSet)
router.register("timetable", TimetableEntryViewSet, basename="timetable")

urlpatterns = router.urls
