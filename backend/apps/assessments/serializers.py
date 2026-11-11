"""Serializers turn model rows into JSON for the frontend and validate JSON coming back."""
import os
from decimal import Decimal

from rest_framework import serializers

from .models import Assessment, AssessmentSettings, GradeBand, SubjectComment

ALLOWED_FILE_TYPES = {".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def check_upload(file):
    if file is None:
        return file
    extension = os.path.splitext(file.name)[1].lower()
    if extension not in ALLOWED_FILE_TYPES:
        raise serializers.ValidationError("Upload a PDF, Word document or image.")
    if file.size > MAX_FILE_SIZE:
        raise serializers.ValidationError("The file is larger than 10 MB.")
    return file


class GradeBandSerializer(serializers.ModelSerializer):
    # Sent as a number (80.0), not text ("80.00"), so the frontend can do sums with it.
    min_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, min_value=Decimal(0), max_value=Decimal(100), coerce_to_string=False
    )

    class Meta:
        model = GradeBand
        fields = ["id", "symbol", "min_percent", "remark"]

    def validate(self, data):
        # The scale is not in the request (there is only the default one), so the
        # "no two bands with the same symbol / threshold" rule is checked by hand.
        scale = self.context["scale"]
        others = scale.bands.exclude(pk=self.instance.pk) if self.instance else scale.bands.all()
        if "symbol" in data and others.filter(symbol=data["symbol"]).exists():
            raise serializers.ValidationError({"symbol": "There is already a band with this symbol."})
        if "min_percent" in data and others.filter(min_percent=data["min_percent"]).exists():
            raise serializers.ValidationError({"min_percent": "Another band already starts at this percentage."})
        return data


class AssessmentSettingsSerializer(serializers.ModelSerializer):
    exam_weight = serializers.IntegerField(read_only=True)

    class Meta:
        model = AssessmentSettings
        fields = ["coursework_weight", "exam_weight", "pass_mark"]


class AssessmentSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="assignment.subject.name", read_only=True)
    subject_group = serializers.CharField(source="assignment.subject.group", read_only=True)
    school_class_name = serializers.CharField(source="assignment.school_class.name", read_only=True)
    # Files go IN through these two fields. They never come back out as links:
    # a marking scheme must not be guessable by URL, so downloads go through a staff-only endpoint.
    paper = serializers.FileField(write_only=True, required=False, allow_null=True, validators=[check_upload])
    marking_scheme = serializers.FileField(write_only=True, required=False, allow_null=True, validators=[check_upload])
    has_paper = serializers.SerializerMethodField()
    has_marking_scheme = serializers.SerializerMethodField()
    # Filled in by the view's queryset: how many students have a score.
    marked_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Assessment
        fields = [
            "id", "assignment", "term", "name", "category", "date", "total_marks",
            "subject_name", "subject_group", "school_class_name",
            "paper", "marking_scheme", "has_paper", "has_marking_scheme", "marked_count",
        ]

    def get_has_paper(self, obj):
        return bool(obj.paper)

    def get_has_marking_scheme(self, obj):
        return bool(obj.marking_scheme)

    def validate(self, data):
        def value(key):  # on PATCH only some keys arrive; fall back to what is saved
            return data.get(key, getattr(self.instance, key, None))

        assignment, term, total = value("assignment"), value("term"), value("total_marks")
        user = self.context["request"].user
        if user.role == "teacher" and assignment.teacher_id != user.id:
            raise serializers.ValidationError("You can only set assessments for classes you teach.")
        if term.year_id != assignment.year_id:
            raise serializers.ValidationError({"term": "Choose a term from the same academic year as the class."})
        if self.instance and self.instance.marks.filter(score__gt=total).exists():
            raise serializers.ValidationError({"total_marks": "Some students already have a higher score than this."})
        return data

    def update(self, instance, validated_data):
        # null for a file means "remove it"
        for field in ("paper", "marking_scheme"):
            if field in validated_data and validated_data[field] is None:
                getattr(instance, field).delete(save=False)
                validated_data.pop(field)
        return super().update(instance, validated_data)

    def create(self, validated_data):
        for field in ("paper", "marking_scheme"):
            if validated_data.get(field) is None:
                validated_data.pop(field, None)
        return super().create(validated_data)


class MarkEntrySerializer(serializers.Serializer):
    """One line of the mark sheet a teacher sends in."""

    student = serializers.IntegerField()
    score = serializers.DecimalField(max_digits=6, decimal_places=2, min_value=Decimal(0), allow_null=True)
    comment = serializers.CharField(max_length=200, allow_blank=True, required=False, default="")


class SubjectCommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubjectComment
        fields = ["student", "assignment", "term", "text"]
        validators = []  # saving twice updates the same comment (see the view), so no "already exists" error

    def validate(self, data):
        user = self.context["request"].user
        if user.role == "teacher" and data["assignment"].teacher_id != user.id:
            raise serializers.ValidationError("You can only comment on classes you teach.")
        return data
