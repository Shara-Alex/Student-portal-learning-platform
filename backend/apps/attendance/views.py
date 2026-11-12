from datetime import date as date_type

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Term
from apps.core.permissions import IsStaff
from apps.notifications.services import notify_absences
from apps.students.models import SchoolClass, Student
from apps.students.permissions import can_view_student
from apps.students.services import class_students, year_for

from .models import AttendanceRecord
from .services import EMPTY, can_mark, student_summary, tally


class EntrySerializer(serializers.Serializer):
    student = serializers.IntegerField()
    status = serializers.ChoiceField(choices=AttendanceRecord.Status.choices)
    note = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")


def day_from(request) -> date_type:
    """?date=2026-11-11, or today if left out."""
    text = request.query_params.get("date")
    day = parse_date(text) if text else timezone.localdate()
    if day is None:
        raise serializers.ValidationError({"date": "Use the format YYYY-MM-DD."})
    return day


def needed(request, name, model):
    value = request.query_params.get(name)
    if not value:
        raise serializers.ValidationError({name: "This is required."})
    return get_object_or_404(model, pk=value)


class RegisterView(APIView):
    """
    GET  /api/attendance/register/?school_class=&date=   the class list with each student's mark
    POST the same address, body {"entries": [{student, status, note}]}  saves the whole register
    """

    permission_classes = [IsStaff]

    def sheet(self, request, school_class, day):
        saved = {r.student_id: r for r in AttendanceRecord.objects.filter(school_class=school_class, date=day)}
        students = class_students(school_class, year_for(day))
        return {
            "school_class": school_class.id,
            "school_class_name": school_class.name,
            "date": day,
            "submitted": bool(saved),
            "can_mark": can_mark(request.user, school_class),
            "rows": [
                {
                    "student": s.id,
                    "full_name": s.full_name,
                    # Everyone starts Present; the teacher only changes the exceptions.
                    "status": saved[s.id].status if s.id in saved else "P",
                    "note": saved[s.id].note if s.id in saved else "",
                }
                for s in students
            ],
        }

    def get(self, request):
        return Response(self.sheet(request, needed(request, "school_class", SchoolClass), day_from(request)))

    def post(self, request):
        school_class = needed(request, "school_class", SchoolClass)
        day = day_from(request)
        if not can_mark(request.user, school_class):
            raise PermissionDenied("You can only mark the register for classes you teach.")
        if day > timezone.localdate():
            raise serializers.ValidationError("A register cannot be marked for a day that has not happened yet.")

        entries = EntrySerializer(data=request.data.get("entries", []), many=True)
        entries.is_valid(raise_exception=True)
        in_class = set(class_students(school_class, year_for(day)).values_list("id", flat=True))
        if any(entry["student"] not in in_class for entry in entries.validated_data):
            raise serializers.ValidationError("One of these students is not in this class.")

        with transaction.atomic():
            for entry in entries.validated_data:
                AttendanceRecord.objects.update_or_create(
                    student_id=entry["student"],
                    date=day,
                    defaults={"school_class": school_class, "status": entry["status"], "note": entry["note"], "marked_by": request.user},
                )
        # After the register is safely saved: email the guardians of anyone marked absent.
        # Saving the same register again does not email them twice (see dedupe_key in notifications).
        absent = [entry["student"] for entry in entries.validated_data if entry["status"] == AttendanceRecord.Status.ABSENT]
        if absent:
            notify_absences(Student.objects.filter(id__in=absent).prefetch_related("guardians"), day)
        return Response(self.sheet(request, school_class, day))


class MyRegistersView(APIView):
    """GET /api/attendance/my-registers/?date=  The registers this user is responsible for, and whether each is done."""

    permission_classes = [IsStaff]

    def get(self, request):
        day = day_from(request)
        classes = SchoolClass.objects.all()
        if request.user.role == "teacher":
            classes = classes.filter(class_teacher=request.user)
        done = set(AttendanceRecord.objects.filter(date=day).values_list("school_class_id", flat=True))
        year = year_for(day)
        rows = []
        for school_class in classes:
            students = class_students(school_class, year).count()
            if students:
                rows.append({"school_class": school_class.id, "name": school_class.name, "students": students, "submitted": school_class.id in done})
        return Response(rows)


class SummaryView(APIView):
    """GET /api/attendance/summary/?school_class=&term=  Present / late / absent per student for a term."""

    permission_classes = [IsStaff]

    def get(self, request):
        school_class = needed(request, "school_class", SchoolClass)
        term = needed(request, "term", Term.objects.select_related("year"))
        students = list(class_students(school_class, term.year))
        records = AttendanceRecord.objects.filter(
            student__in=students, date__range=(term.start_date, term.end_date)
        ).values_list("student_id", "status")
        counts = tally(records)
        return Response([{"student": s.id, "full_name": s.full_name, **counts.get(s.id, EMPTY)} for s in students])


class StudentAttendanceView(APIView):
    """GET /api/attendance/student/?student=&term=  One student's term. Staff, their guardians, or the student."""

    def get(self, request):
        student = needed(request, "student", Student)
        if not can_view_student(request.user, student):
            raise PermissionDenied("You can only see your own child's attendance.")
        return Response(student_summary(student, needed(request, "term", Term)))
