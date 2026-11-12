import os

from rest_framework import serializers

from .models import Application

ALLOWED_FILE_TYPES = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB: this form is open to the public, so the limit is tight

FAMILY_FIELDS = [
    "first_name", "last_name", "gender", "date_of_birth", "applying_for",
    "previous_school", "reason_for_transfer", "medical_notes",
    "guardian_first_name", "guardian_last_name", "guardian_relationship", "guardian_phone", "guardian_email",
]


def check_document(file):
    if file is None:
        return file
    if os.path.splitext(file.name)[1].lower() not in ALLOWED_FILE_TYPES:
        raise serializers.ValidationError("Upload a PDF or a photo (JPG or PNG).")
    if file.size > MAX_FILE_SIZE:
        raise serializers.ValidationError("The file is larger than 5 MB.")
    return file


class PublicApplicationSerializer(serializers.ModelSerializer):
    """What a family may send in. Status, staff notes and the linked student are NOT here, so they cannot be set from outside."""

    document = serializers.FileField(write_only=True, required=False, allow_null=True, validators=[check_document])

    class Meta:
        model = Application
        fields = FAMILY_FIELDS + ["document"]

    def create(self, validated_data):
        if validated_data.get("document") is None:
            validated_data.pop("document", None)
        return super().create(validated_data)


class ApplicationSerializer(serializers.ModelSerializer):
    """What staff see and may change."""

    full_name = serializers.SerializerMethodField()
    guardian_name = serializers.SerializerMethodField()
    has_document = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ["id", "full_name", "guardian_name", *FAMILY_FIELDS, "has_document", "status", "notes", "student", "created_at"]
        read_only_fields = ["student"]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"

    def get_guardian_name(self, obj):
        return f"{obj.guardian_first_name} {obj.guardian_last_name}"

    def get_has_document(self, obj):
        return bool(obj.document)

    def validate_status(self, value):
        if value == Application.Status.ENROLLED and (not self.instance or not self.instance.student_id):
            raise serializers.ValidationError("Use the Enrol button, which also creates the student record.")
        return value


class EnrolSerializer(serializers.Serializer):
    admission_number = serializers.CharField(max_length=30)
    school_class = serializers.IntegerField(required=False, allow_null=True)
