from datetime import date

from django.db.models import Q
from rest_framework import serializers, viewsets

from apps.core.permissions import IsAdmin

from .models import AuditEntry
from .serializers import AuditEntrySerializer


def number(params, key):
    """A whole number from the address, or None. Letters are refused with a clear 400, not a crash."""
    value = params.get(key, "").strip()
    if not value:
        return None
    if not value.isdigit():
        raise serializers.ValidationError({key: "Must be a whole number."})
    return int(value)


def day(params, key):
    value = params.get(key, "").strip()
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise serializers.ValidationError({key: "Use a date written as YYYY-MM-DD."})


class AuditEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    /api/audit/entries/?action=&actor=&student=&target_type=&target_id=&date_from=&date_to=&search=
    Admins only. Newest first, a page at a time.
    Read-only on purpose: there is no address that changes or deletes an entry.

    Handy filters:
      ?student=12                          everything about one student (marks, payments, logins)
      ?target_type=mark&target_id=512      the full history of one mark
      ?actor=4                             everything one member of staff did
    """

    serializer_class = AuditEntrySerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        params = self.request.query_params
        qs = AuditEntry.objects.select_related("student")
        if params.get("action"):
            qs = qs.filter(action=params["action"])
        if params.get("target_type"):
            qs = qs.filter(target_type=params["target_type"])
        for key in ("actor", "student", "target_id"):
            value = number(params, key)
            if value is not None:
                qs = qs.filter(**{key: value})
        if (start := day(params, "date_from")) is not None:
            qs = qs.filter(at__date__gte=start)
        if (end := day(params, "date_to")) is not None:
            qs = qs.filter(at__date__lte=end)
        if search := params.get("search", "").strip():
            qs = qs.filter(Q(summary__icontains=search) | Q(actor_name__icontains=search))
        return qs
