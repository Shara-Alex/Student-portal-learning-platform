import os

from django.db import transaction
from django.db.models import Count, Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.academics.models import TeachingAssignment
from apps.core.models import Term
from apps.core.permissions import IsStaff, StaffReadAdminWrite
from apps.students.models import SchoolClass, Student
from apps.students.services import class_students

from . import services
from .models import Assessment, AssessmentSettings, GradeScale, Mark, SubjectComment
from .permissions import AssessmentPermission, can_view_student
from .serializers import (
    AssessmentSerializer,
    AssessmentSettingsSerializer,
    GradeBandSerializer,
    MarkEntrySerializer,
    SubjectCommentSerializer,
)


def required(request, name, model):
    """Read ?name=<id> from the address and load that row, or answer with a clear 400 / 404."""
    value = request.query_params.get(name)
    if not value:
        raise serializers.ValidationError({name: "This is required."})
    return get_object_or_404(model, pk=value)


class GradeBandViewSet(viewsets.ModelViewSet):
    """/api/assessments/bands/  The school's grading scale. Staff read it, admins change it."""

    serializer_class = GradeBandSerializer
    permission_classes = [StaffReadAdminWrite]
    pagination_class = None

    def get_queryset(self):
        return GradeScale.default().bands.all()

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "scale": GradeScale.default()}

    def perform_create(self, serializer):
        serializer.save(scale=GradeScale.default())


class SettingsView(APIView):
    """GET/PUT /api/assessments/settings/  The coursework / exam split."""

    permission_classes = [StaffReadAdminWrite]

    def get(self, request):
        return Response(AssessmentSettingsSerializer(AssessmentSettings.current()).data)

    def put(self, request):
        serializer = AssessmentSettingsSerializer(AssessmentSettings.current(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AssessmentViewSet(viewsets.ModelViewSet):
    """
    /api/assessments/assessments/?assignment=&term=
    /api/assessments/assessments/<id>/marks/                 GET the mark sheet, POST to save it
    /api/assessments/assessments/<id>/file/paper/            download (staff only)
    /api/assessments/assessments/<id>/file/marking_scheme/
    """

    serializer_class = AssessmentSerializer
    permission_classes = [AssessmentPermission]
    pagination_class = None

    def get_queryset(self):
        qs = Assessment.objects.select_related("assignment__subject", "assignment__school_class").annotate(
            marked_count=Count("marks", filter=Q(marks__score__isnull=False))
        )
        if self.action == "list":
            params = self.request.query_params
            if params.get("assignment"):
                qs = qs.filter(assignment_id=params["assignment"])
            if params.get("term"):
                qs = qs.filter(term_id=params["term"])
        return qs

    def _mark_sheet(self, assessment):
        saved = {m.student_id: m for m in assessment.marks.all()}
        students = class_students(assessment.assignment.school_class, assessment.assignment.year)
        return {
            "assessment": AssessmentSerializer(assessment, context=self.get_serializer_context()).data,
            "rows": [
                {
                    "student": s.id,
                    "admission_number": s.admission_number,
                    "full_name": s.full_name,
                    "score": float(saved[s.id].score) if s.id in saved and saved[s.id].score is not None else None,
                    "comment": saved[s.id].comment if s.id in saved else "",
                }
                for s in students
            ],
        }

    @action(detail=True, methods=["get", "post"])
    def marks(self, request, pk=None):
        assessment = self.get_object()  # also checks "may this user change it?" on POST
        if request.method == "GET":
            return Response(self._mark_sheet(assessment))

        entries = MarkEntrySerializer(data=request.data.get("marks", []), many=True)
        entries.is_valid(raise_exception=True)
        in_class = set(
            class_students(assessment.assignment.school_class, assessment.assignment.year).values_list("id", flat=True)
        )
        for entry in entries.validated_data:
            if entry["student"] not in in_class:
                raise serializers.ValidationError("One of these students is not in this class.")
            if entry["score"] is not None and entry["score"] > assessment.total_marks:
                raise serializers.ValidationError(f"A score cannot be more than the total of {assessment.total_marks}.")

        # All or nothing: a half-saved mark sheet would be worse than none.
        with transaction.atomic():
            for entry in entries.validated_data:
                Mark.objects.update_or_create(
                    assessment=assessment,
                    student_id=entry["student"],
                    defaults={"score": entry["score"], "comment": entry["comment"]},
                )
        return Response(self._mark_sheet(assessment))

    @action(detail=True, url_path=r"file/(?P<kind>paper|marking_scheme)")
    def file(self, request, pk=None, kind=None):
        stored = getattr(self.get_object(), kind)
        if not stored:
            raise NotFound("No file has been uploaded.")
        return FileResponse(stored.open("rb"), as_attachment=True, filename=os.path.basename(stored.name))


class GradebookView(APIView):
    """GET /api/assessments/gradebook/?assignment=&term=  One class, one subject, one term."""

    permission_classes = [IsStaff]

    def get(self, request):
        assignment = required(request, "assignment", TeachingAssignment.objects.select_related("subject", "school_class", "teacher", "year"))
        term = required(request, "term", Term)
        assessments, rows = services.gradebook(assignment, term)
        counts = dict(
            Mark.objects.filter(assessment__in=assessments, score__isnull=False)
            .values_list("assessment_id").annotate(n=Count("id"))
        )
        for assessment in assessments:
            assessment.marked_count = counts.get(assessment.id, 0)
        return Response({
            "assignment": {
                "id": assignment.id,
                "subject_name": assignment.subject.name,
                "subject_group": assignment.subject.group,
                "school_class_name": assignment.school_class.name,
                "teacher": assignment.teacher_id,
                "teacher_name": str(assignment.teacher),
            },
            "coursework_weight": AssessmentSettings.current().coursework_weight,
            "pass_mark": AssessmentSettings.current().pass_mark,
            "assessments": AssessmentSerializer(assessments, many=True, context={"request": request}).data,
            "rows": rows,
        })


class SubjectCommentView(APIView):
    """POST /api/assessments/comments/  Save the term comment for one student in one subject."""

    permission_classes = [IsStaff]

    def post(self, request):
        serializer = SubjectCommentSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        SubjectComment.objects.update_or_create(
            student=data["student"], assignment=data["assignment"], term=data["term"], defaults={"text": data["text"]}
        )
        return Response(serializer.data)


class OutstandingView(APIView):
    """GET /api/assessments/outstanding/  This term's assessments that still have students without a mark."""

    permission_classes = [IsStaff]

    def get(self, request):
        current = Assessment.objects.filter(term__is_current=True).select_related(
            "assignment__subject", "assignment__school_class", "assignment__year"
        ).annotate(marked=Count("marks", filter=Q(marks__score__isnull=False)))
        if request.user.role == "teacher":
            current = current.filter(assignment__teacher=request.user)
        rows = []
        for assessment in current:
            assignment = assessment.assignment
            students = class_students(assignment.school_class, assignment.year).count()
            if assessment.marked < students:
                rows.append({
                    "id": assessment.id,
                    "name": assessment.name,
                    "assignment": assignment.id,
                    "subject_name": assignment.subject.name,
                    "school_class_name": assignment.school_class.name,
                    "marked": assessment.marked,
                    "students": students,
                })
        return Response(rows[:10])


class ClassResultsView(APIView):
    """GET /api/assessments/class-results/?school_class=&term=  One line per student."""

    permission_classes = [IsStaff]

    def get(self, request):
        school_class = required(request, "school_class", SchoolClass)
        term = required(request, "term", Term.objects.select_related("year"))
        return Response(services.class_results(school_class, term))


class StudentResultsView(APIView):
    """Shared by the report card and the transcript: load the student and check who is asking."""

    def get_student(self, request):
        student = required(request, "student", Student)
        if not can_view_student(request.user, student):
            raise PermissionDenied("You can only see your own child's results.")
        return student


class ReportCardView(StudentResultsView):
    """GET /api/assessments/report-card/?student=&term=  Staff, the student's guardians, or the student."""

    def get(self, request):
        student = self.get_student(request)
        term = required(request, "term", Term.objects.select_related("year"))
        return Response(services.report_card(student, term))


class TranscriptView(StudentResultsView):
    """GET /api/assessments/transcript/?student=  Every term on record."""

    def get(self, request):
        student = self.get_student(request)
        return Response({
            "student": {"id": student.id, "full_name": student.full_name, "admission_number": student.admission_number},
            "terms": services.transcript(student),
        })
