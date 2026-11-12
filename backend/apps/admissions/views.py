import os

from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from apps.core.models import AcademicYear, School
from apps.core.permissions import IsAdmin
from apps.students.models import Guardian, SchoolClass, Student

from .models import Application
from .serializers import ApplicationSerializer, EnrolSerializer, PublicApplicationSerializer


class ApplyThrottle(AnonRateThrottle):
    """The public form is the one address anyone on the internet can post to, so it is rate limited."""

    rate = "20/hour"


class PublicApplyView(APIView):
    """
    GET  /api/admissions/apply/  the school's name, for the top of the form
    POST /api/admissions/apply/  send in an application. No login needed.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # ignore any stale login token; this page is for people without accounts
    throttle_classes = [ApplyThrottle]

    def get(self, request):
        school = School.current()
        return Response({"school": school.name if school else ""})

    def post(self, request):
        serializer = PublicApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        # Deliberately says nothing about the saved record: the sender is a stranger.
        return Response({"received": True}, status=201)


class ApplicationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    /api/admissions/applications/?status=
    /api/admissions/applications/<id>/enrol/     POST: create the student and guardian
    /api/admissions/applications/<id>/document/  download the supporting document
    """

    serializer_class = ApplicationSerializer
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_queryset(self):
        qs = Application.objects.all()
        if self.action == "list" and self.request.query_params.get("status"):
            qs = qs.filter(status=self.request.query_params["status"])
        return qs

    @action(detail=True, methods=["post"])
    def enrol(self, request, pk=None):
        application = self.get_object()
        if application.student_id:
            raise serializers.ValidationError("This applicant has already been enrolled.")
        form = EnrolSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        number = form.validated_data["admission_number"].strip()
        if Student.objects.filter(admission_number=number).exists():
            raise serializers.ValidationError({"admission_number": "Another student already has this admission number."})

        class_id = form.validated_data.get("school_class")
        school_class = get_object_or_404(SchoolClass, pk=class_id) if class_id else None
        year = AcademicYear.objects.filter(is_current=True).first()
        if school_class and year is None:
            raise serializers.ValidationError({"school_class": "Mark an academic year as current before placing students in classes."})

        # Student, guardian, class placement and the status change all succeed together or not at all.
        with transaction.atomic():
            student = Student.objects.create(
                admission_number=number,
                first_name=application.first_name,
                last_name=application.last_name,
                gender=application.gender,
                date_of_birth=application.date_of_birth,
                medical_notes=application.medical_notes,
            )
            guardian = Guardian.objects.create(
                first_name=application.guardian_first_name,
                last_name=application.guardian_last_name,
                relationship=application.guardian_relationship,
                phone=application.guardian_phone,
                email=application.guardian_email,
            )
            student.guardians.add(guardian)
            if school_class:
                student.enrol(school_class, year)
            application.student = student
            application.status = Application.Status.ENROLLED
            application.save(update_fields=["student", "status", "updated_at"])
        return Response(self.get_serializer(application).data)

    @action(detail=True)
    def document(self, request, pk=None):
        stored = self.get_object().document
        if not stored:
            raise NotFound("No document was uploaded.")
        return FileResponse(stored.open("rb"), as_attachment=True, filename=os.path.basename(stored.name))
