"""Serializers turn model rows into JSON for the frontend and validate JSON coming back."""
from django.db import transaction
from rest_framework import serializers

from apps.core.models import AcademicYear

from .models import Enrolment, Guardian, SchoolClass, Student


class SchoolClassSerializer(serializers.ModelSerializer):
    class_teacher_name = serializers.SerializerMethodField()
    # Filled in by the view's queryset (annotate). Counts students in the current year.
    student_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = SchoolClass
        fields = ["id", "name", "level", "class_teacher", "class_teacher_name", "student_count"]

    def get_class_teacher_name(self, obj):
        return str(obj.class_teacher) if obj.class_teacher else ""


class GuardianSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    # The username of their portal login, or "" if they have not been given one.
    username = serializers.CharField(source="user.username", read_only=True, default="")

    class Meta:
        model = Guardian
        fields = ["id", "first_name", "last_name", "full_name", "relationship", "phone", "email", "address", "username"]


class StudentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    # Write: a list of guardian ids. Read: the same ids, plus full details below.
    guardians = serializers.PrimaryKeyRelatedField(many=True, queryset=Guardian.objects.all(), required=False)
    guardian_details = GuardianSerializer(source="guardians", many=True, read_only=True)
    # Write-only: the class to put the student in for the CURRENT academic year.
    school_class = serializers.PrimaryKeyRelatedField(
        queryset=SchoolClass.objects.all(), write_only=True, required=False, allow_null=True
    )
    current_class = serializers.SerializerMethodField()
    current_class_name = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username", read_only=True, default="")

    class Meta:
        model = Student
        fields = [
            "id", "admission_number", "first_name", "last_name", "full_name", "gender",
            "date_of_birth", "admission_date", "status", "address",
            "blood_group", "allergies", "medical_notes",
            "guardians", "guardian_details",
            "school_class", "current_class", "current_class_name", "username",
        ]

    # --- reading -----------------------------------------------------------
    def _current_enrolment(self, obj):
        # The list view pre-loads this as `current_enrolments` (see views.py) so
        # we do not run one extra query per student. Fall back to a query otherwise.
        cached = getattr(obj, "current_enrolments", None)
        if cached is None:
            cached = list(obj.enrolments.filter(year__is_current=True).select_related("school_class"))
        return cached[0] if cached else None

    def get_current_class(self, obj):
        enrolment = self._current_enrolment(obj)
        return enrolment.school_class_id if enrolment else None

    def get_current_class_name(self, obj):
        enrolment = self._current_enrolment(obj)
        return enrolment.school_class.name if enrolment else ""

    # --- writing -----------------------------------------------------------
    def _apply_class(self, student, school_class):
        year = AcademicYear.objects.filter(is_current=True).first()
        if year is None:
            if school_class is None:
                return
            raise serializers.ValidationError(
                {"school_class": "Mark an academic year as current before placing students in classes."}
            )
        enrolment = student.enrol(school_class, year)
        student.current_enrolments = [enrolment] if enrolment else []

    @transaction.atomic
    def create(self, validated_data):
        school_class = validated_data.pop("school_class", None)
        student = super().create(validated_data)
        if school_class is not None:
            self._apply_class(student, school_class)
        return student

    @transaction.atomic
    def update(self, instance, validated_data):
        # "school_class" missing -> leave the class alone. Present (even null) -> apply it.
        change_class = "school_class" in validated_data
        school_class = validated_data.pop("school_class", None)
        student = super().update(instance, validated_data)
        if change_class:
            self._apply_class(student, school_class)
        return student


class EnrolmentSerializer(serializers.ModelSerializer):
    school_class_name = serializers.CharField(source="school_class.name", read_only=True)
    year_name = serializers.CharField(source="year.name", read_only=True)

    class Meta:
        model = Enrolment
        fields = ["id", "student", "school_class", "school_class_name", "year", "year_name"]


class PromoteSerializer(serializers.Serializer):
    """
    Year-end promotion: move the students of one class into next year.

    from_class  the class they are in now (current academic year)
    to_year     the academic year they are moving into
    to_class    their class in that year, or null = they are leaving (mark as graduated)
    students    optional list of ids; leave out to move every active student in the class
    """

    from_class = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all())
    to_year = serializers.PrimaryKeyRelatedField(queryset=AcademicYear.objects.all())
    to_class = serializers.PrimaryKeyRelatedField(queryset=SchoolClass.objects.all(), allow_null=True)
    students = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all(), many=True, required=False)

    def validate(self, data):
        current = AcademicYear.objects.filter(is_current=True).first()
        if current is None:
            raise serializers.ValidationError("Mark an academic year as current first.")
        if data["to_year"] == current:
            raise serializers.ValidationError({"to_year": "Choose a different year from the current one."})
        data["from_year"] = current
        return data

    @transaction.atomic
    def save(self):
        data = self.validated_data
        students = Student.objects.filter(
            status=Student.Status.ACTIVE,
            enrolments__school_class=data["from_class"],
            enrolments__year=data["from_year"],
        )
        if "students" in data:
            students = students.filter(pk__in=[s.pk for s in data["students"]])

        result = {"promoted": 0, "graduated": 0}
        for student in students:
            if data["to_class"] is None:
                student.status = Student.Status.GRADUATED
                student.save(update_fields=["status", "updated_at"])
                result["graduated"] += 1
            else:
                student.enrol(data["to_class"], data["to_year"])
                result["promoted"] += 1
        return result
