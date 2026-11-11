from rest_framework import viewsets

from apps.core.mixins import ProtectedDeleteMixin
from apps.core.permissions import ReadOnlyOrAdmin

from .models import Period, Subject, TeachingAssignment, TimetableEntry
from .serializers import (
    PeriodSerializer,
    SubjectSerializer,
    TeachingAssignmentSerializer,
    TimetableEntrySerializer,
    current_year,
)

# Everything here is readable by anyone logged in (a timetable is not private)
# and editable only by admins. Lists are small, so none of them are paginated.


def filter_year_class_teacher(qs, request, prefix=""):
    """
    Shared filtering for assignments and timetable entries.
    ?school_class=3   one class
    ?teacher=7        one teacher  (?teacher=me = whoever is logged in)
    ?year=2           one year     (default: the current academic year)
    `prefix` is the path from the model to the assignment fields.
    """
    params = request.query_params
    year = params.get("year") or getattr(current_year(), "id", None)
    qs = qs.filter(**{f"{prefix}year_id": year})
    if params.get("school_class"):
        qs = qs.filter(**{f"{prefix}school_class_id": params["school_class"]})
    if params.get("teacher"):
        teacher = request.user.id if params["teacher"] == "me" else params["teacher"]
        qs = qs.filter(**{f"{prefix}teacher_id": teacher})
    return qs


class SubjectViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """/api/academics/subjects/"""

    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None
    protected_message = "This subject is being taught to a class, so it cannot be deleted."


class TeachingAssignmentViewSet(viewsets.ModelViewSet):
    """/api/academics/assignments/?school_class=&teacher=&year="""

    serializer_class = TeachingAssignmentSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = TeachingAssignment.objects.select_related("subject", "school_class", "teacher")
        # Filters only narrow the LIST. Opening or editing one record by id must always work.
        return filter_year_class_teacher(qs, self.request) if self.action == "list" else qs


class PeriodViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """/api/academics/periods/"""

    queryset = Period.objects.all()
    serializer_class = PeriodSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None
    protected_message = "This period has lessons on the timetable, so it cannot be deleted."


class TimetableEntryViewSet(viewsets.ModelViewSet):
    """/api/academics/timetable/?school_class=&teacher=&year="""

    serializer_class = TimetableEntrySerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = TimetableEntry.objects.select_related(
            "period", "assignment__subject", "assignment__school_class", "assignment__teacher"
        )
        return filter_year_class_teacher(qs, self.request, "assignment__") if self.action == "list" else qs
