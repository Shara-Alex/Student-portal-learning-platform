"""Mounted at /api/fees/"""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import FeeViewSet, InvoiceViewSet, PaymentViewSet, SettingsView, StatementView

router = DefaultRouter()
router.register("fees", FeeViewSet, basename="fee")
router.register("invoices", InvoiceViewSet, basename="invoice")
router.register("payments", PaymentViewSet, basename="payment")

urlpatterns = [
    path("settings/", SettingsView.as_view()),
    path("statement/", StatementView.as_view()),
    path("", include(router.urls)),
]
