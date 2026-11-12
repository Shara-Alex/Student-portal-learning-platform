from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Term
from apps.core.permissions import IsAdmin, IsFinance
from apps.fees.models import Invoice

from .models import Notification, NotificationSettings
from .serializers import FeeReminderSerializer, NotificationSerializer, NotificationSettingsSerializer
from .services import queue_fee_reminders, send_pending


class SettingsView(APIView):
    """GET/PUT /api/notifications/settings/  Which automatic emails are switched on (admin)."""

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(NotificationSettingsSerializer(NotificationSettings.current()).data)

    def put(self, request):
        serializer = NotificationSettingsSerializer(NotificationSettings.current(), data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class NotificationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    /api/notifications/log/?kind=&status=&student=    everything the school has sent, newest first (admin)
    /api/notifications/log/send-pending/              POST: send what is waiting and retry failures (admin)
    /api/notifications/log/fee-reminders/             POST {term, overdue_only}: email fee reminders (admin, bursar)
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        qs = Notification.objects.select_related("student")
        for name in ("kind", "status", "student"):
            value = self.request.query_params.get(name)
            if value:
                qs = qs.filter(**{name: value})
        return qs

    @action(detail=False, methods=["post"], url_path="send-pending")
    def send_pending(self, request):
        return Response(send_pending())

    @action(detail=False, methods=["post"], url_path="fee-reminders", permission_classes=[IsFinance])
    def fee_reminders(self, request):
        form = FeeReminderSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data
        term = get_object_or_404(Term, pk=data["term"]) if data.get("term") else Term.objects.filter(is_current=True).first()
        if term is None:
            raise serializers.ValidationError("There is no current term. Choose a term.")
        invoices = Invoice.objects.filter(term=term).select_related("student", "term__year").prefetch_related(
            "lines", "payments", "student__guardians"
        )
        return Response(queue_fee_reminders(invoices, data["overdue_only"]))
