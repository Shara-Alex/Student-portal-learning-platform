from django.db.models import Count, Prefetch, Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from apps.core.mixins import ProtectedDeleteMixin
from apps.core.permissions import ReadOnlyOrAdmin, StaffReadAdminWrite

from .models import Enrolment, Guardian, SchoolClass, Student
from .serializers import (
    EnrolmentSerializer,
    GuardianSerializer,
    PromoteSerializer,
    SchoolClassSerializer,
    StudentSerializer,
)


class SchoolClassViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """/api/students/classes/  Everyone can read the class list; only admins change it."""

    serializer_class = SchoolClassSerializer
    permission_classes = [ReadOnlyOrAdmin]
    pagination_class = None  # a school has few classes; the frontend wants them all for dropdowns
    protected_message = "This class has students enrolled in it, so it cannot be deleted."

    def get_queryset(self):
        return SchoolClass.objects.select_related("class_teacher").annotate(
            student_count=Count("enrolments", filter=Q(enrolments__year__is_current=True))
        )


class GuardianViewSet(viewsets.ModelViewSet):
    """/api/students/guardians/?search=  Staff only: this is contact data."""

    queryset = Guardian.objects.all()
    serializer_class = GuardianSerializer
    permission_classes = [StaffReadAdminWrite]
    filter_backends = [SearchFilter]
    search_fields = ["first_name", "last_name", "phone", "email"]


class StudentViewSet(viewsets.ModelViewSet):
    """
    /api/students/students/?search=&school_class=&status=

    Who sees what:
      admin, teacher -> every student
      parent         -> only their own children
      student        -> only themselves
    """

    serializer_class = StudentSerializer
    permission_classes = [ReadOnlyOrAdmin]
    filter_backends = [SearchFilter]
    search_fields = ["first_name", "last_name", "admission_number"]

    def get_queryset(self):
        current = Enrolment.objects.filter(year__is_current=True).select_related("school_class")
        qs = Student.objects.prefetch_related(
            "guardians", Prefetch("enrolments", queryset=current, to_attr="current_enrolments")
        )

        user = self.request.user
        if user.role == "parent":
            qs = qs.filter(guardians__user=user)
        elif user.role == "student":
            qs = qs.filter(user=user)

        params = self.request.query_params
        if params.get("school_class"):
            qs = qs.filter(enrolments__school_class_id=params["school_class"], enrolments__year__is_current=True)
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        return qs


class EnrolmentViewSet(viewsets.ModelViewSet):
    """/api/students/enrolments/?student=  Class history, one row per student per year."""

    serializer_class = EnrolmentSerializer
    permission_classes = [StaffReadAdminWrite]

    def get_queryset(self):
        qs = Enrolment.objects.select_related("school_class", "year")
        if self.request.query_params.get("student"):
            qs = qs.filter(student_id=self.request.query_params["student"])
        return qs

    @action(detail=False, methods=["post"])
    def promote(self, request):
        """POST /api/students/enrolments/promote/  Year-end promotion of one class (admin only)."""
        serializer = PromoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.save())
