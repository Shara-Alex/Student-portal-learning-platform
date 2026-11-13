from rest_framework import serializers

from .models import AuditEntry


class AuditEntrySerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source="get_action_display", read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = AuditEntry
        fields = [
            "id", "at", "actor", "actor_name", "actor_role", "action", "action_label",
            "target_type", "target_id", "summary", "changes", "student", "student_name",
        ]
        read_only_fields = fields

    def get_student_name(self, obj):
        return obj.student.full_name if obj.student else ""
