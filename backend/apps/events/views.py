from django.db.models import Q
from django.utils import timezone
from rest_framework import viewsets

from apps.core.permissions import ALL_STAFF, ReadOnlyOrAdmin

from .models import Announcement, Audience, Event
from .serializers import AnnouncementSerializer, EventSerializer


class AudienceMixin:
    """Parents and students never receive staff-only items."""

    def for_audience(self, qs):
        if self.request.user.role in ALL_STAFF:
            return qs
        return qs.filter(audience=Audience.EVERYONE)


class EventViewSet(AudienceMixin, viewsets.ModelViewSet):
    """/api/events/events/?upcoming=1  Everyone reads the calendar; admins change it."""

    serializer_class = EventSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = self.for_audience(Event.objects.all())
        if self.action == "list" and self.request.query_params.get("upcoming"):
            today = timezone.localdate()
            # Still to come, or happening now (a multi-day event that has started but not ended).
            qs = qs.filter(Q(start_date__gte=today) | Q(end_date__gte=today))
        return qs


class AnnouncementViewSet(AudienceMixin, viewsets.ModelViewSet):
    """/api/events/announcements/  Notices that have not expired, pinned ones first."""

    serializer_class = AnnouncementSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = self.for_audience(Announcement.objects.select_related("author"))
        if self.action == "list" and self.request.user.role != "admin":
            # Admins keep seeing expired notices so they can tidy them up.
            qs = qs.filter(Q(publish_until__isnull=True) | Q(publish_until__gte=timezone.localdate()))
        return qs

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
