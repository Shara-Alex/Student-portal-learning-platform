"""Mounted at /api/assessments/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssessmentViewSet,
    ClassResultsView,
    GradebookView,
    OutstandingView,
    GradeBandViewSet,
    ReportCardView,
    SettingsView,
    SubjectCommentView,
    TranscriptView,
)

router = DefaultRouter()
router.register("assessments", AssessmentViewSet, basename="assessment")
router.register("bands", GradeBandViewSet, basename="band")

urlpatterns = [
    path("settings/", SettingsView.as_view()),
    path("gradebook/", GradebookView.as_view()),
    path("comments/", SubjectCommentView.as_view()),
    path("outstanding/", OutstandingView.as_view()),
    path("class-results/", ClassResultsView.as_view()),
    path("report-card/", ReportCardView.as_view()),
    path("transcript/", TranscriptView.as_view()),
    path("", include(router.urls)),
]
