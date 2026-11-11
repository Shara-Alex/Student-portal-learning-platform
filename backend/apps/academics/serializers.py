"""Serializers turn model rows into JSON for the frontend and validate JSON coming back."""
from rest_framework import serializers

from apps.core.models import AcademicYear, User

from .models import Period, Subject, TeachingAssignment, TimetableEntry


def current_year():
    return AcademicYear.objects.filter(is_current=True).first()


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ["id", "name", "code"]


class TeachingAssignmentSerializer(serializers.ModelSerializer):
    # Leave `year` out when saving and it becomes the current academic year.
    year = serializers.PrimaryKeyRelatedField(queryset=AcademicYear.objects.all(), default=current_year)
    teacher = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(role="teacher"))
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_code = serializers.CharField(source="subject.code", read_only=True)
    school_class_name = serializers.CharField(source="school_class.name", read_only=True)
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = TeachingAssignment
        fields = [
            "id", "year", "school_class", "school_class_name",
            "subject", "subject_name", "subject_code", "teacher", "teacher_name",
        ]

    def get_teacher_name(self, obj):
        return str(obj.teacher)

    def validate_year(self, value):
        if value is None:
            raise serializers.ValidationError("Mark an academic year as current first.")
        return value


class PeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Period
        fields = ["id", "name", "start_time", "end_time", "is_break"]

    def validate(self, data):
        start = data.get("start_time", getattr(self.instance, "start_time", None))
        end = data.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError({"end_time": "The end time must be after the start time."})
        return data


class TimetableEntrySerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="assignment.subject.name", read_only=True)
    subject_code = serializers.CharField(source="assignment.subject.code", read_only=True)
    teacher_name = serializers.SerializerMethodField()
    school_class = serializers.IntegerField(source="assignment.school_class_id", read_only=True)
    school_class_name = serializers.CharField(source="assignment.school_class.name", read_only=True)

    class Meta:
        model = TimetableEntry
        fields = [
            "id", "assignment", "day", "period", "room",
            "subject_name", "subject_code", "teacher_name", "school_class", "school_class_name",
        ]

    def get_teacher_name(self, obj):
        return str(obj.assignment.teacher)

    def validate(self, data):
        # On a partial update (PATCH) only some keys arrive, so fall back to the saved values.
        def value(key):
            return data.get(key, getattr(self.instance, key, None))

        assignment, day, period = value("assignment"), value("day"), value("period")
        if period.is_break:
            raise serializers.ValidationError({"period": "Lessons cannot be placed in a break."})

        # Every other lesson in the same slot of the same year.
        same_slot = TimetableEntry.objects.filter(day=day, period=period, assignment__year=assignment.year)
        if self.instance:
            same_slot = same_slot.exclude(pk=self.instance.pk)

        clash = same_slot.filter(assignment__school_class=assignment.school_class).first()
        if clash:
            raise serializers.ValidationError(
                f"{assignment.school_class} already has {clash.assignment.subject} in this slot."
            )
        clash = same_slot.filter(assignment__teacher=assignment.teacher).first()
        if clash:
            raise serializers.ValidationError(
                f"{assignment.teacher} is already teaching {clash.assignment.school_class} in this slot."
            )
        return data
