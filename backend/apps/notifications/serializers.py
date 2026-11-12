from rest_framework import serializers

from .models import Notification, NotificationSettings


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = ["absence", "payment", "notice"]


class NotificationSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True, default="")

    class Meta:
        model = Notification
        fields = [
            "id", "kind", "kind_label", "channel", "to", "recipient_name", "student", "student_name",
            "subject", "body", "status", "attempts", "error", "created_at", "sent_at",
        ]


class FeeReminderSerializer(serializers.Serializer):
    term = serializers.IntegerField(required=False)  # left out = the current term
    overdue_only = serializers.BooleanField(default=True)
