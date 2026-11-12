"""Mounted at /api/attendance/"""
from django.urls import path

from .views import MyRegistersView, RegisterView, StudentAttendanceView, SummaryView

urlpatterns = [
    path("register/", RegisterView.as_view()),
    path("my-registers/", MyRegistersView.as_view()),
    path("summary/", SummaryView.as_view()),
    path("student/", StudentAttendanceView.as_view()),
]
