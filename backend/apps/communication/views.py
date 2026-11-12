from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import User

from .models import Message
from .serializers import STAFF, MessageSerializer


class MessageViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """
    /api/communication/messages/?box=inbox|sent
    /api/communication/messages/unread/       how many unread
    /api/communication/messages/recipients/   who this user may write to (?search=)

    Messages can be sent and read, never edited or deleted, so there is a record of what was said.
    """

    serializer_class = MessageSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.select_related("sender", "recipient")
        if self.action == "list":
            if self.request.query_params.get("box") == "sent":
                return qs.filter(sender=user)
            return qs.filter(recipient=user)
        # Opening one message: only if it is yours (sent or received).
        return qs.filter(Q(sender=user) | Q(recipient=user))

    def retrieve(self, request, *args, **kwargs):
        message = self.get_object()
        if message.recipient_id == request.user.id and message.read_at is None:
            message.read_at = timezone.now()
            message.save(update_fields=["read_at"])
        return Response(self.get_serializer(message).data)

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    @action(detail=False)
    def unread(self, request):
        return Response({"count": Message.objects.filter(recipient=request.user, read_at__isnull=True).count()})

    @action(detail=False)
    def recipients(self, request):
        people = User.objects.filter(is_active=True).exclude(pk=request.user.pk)
        if request.user.role not in STAFF:
            people = people.filter(role__in=STAFF)
        search = request.query_params.get("search", "").strip()
        if search:
            people = people.filter(
                Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(username__icontains=search)
            )
        people = people.order_by("last_name", "first_name", "username")[:20]
        return Response([{"id": p.id, "name": str(p), "role": p.role} for p in people])
