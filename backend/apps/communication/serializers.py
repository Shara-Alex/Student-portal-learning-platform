from rest_framework import serializers

from apps.core.models import User

from .models import Message

STAFF = ("admin", "teacher")


class MessageSerializer(serializers.ModelSerializer):
    recipient = serializers.PrimaryKeyRelatedField(queryset=User.objects.filter(is_active=True))
    sender_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()
    is_read = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "sender", "sender_name", "recipient", "recipient_name",
            "subject", "body", "reply_to", "is_read", "created_at",
        ]
        read_only_fields = ["sender"]

    def get_sender_name(self, obj):
        return str(obj.sender)

    def get_recipient_name(self, obj):
        return str(obj.recipient)

    def get_is_read(self, obj):
        return obj.read_at is not None

    def validate(self, data):
        user = self.context["request"].user
        if data["recipient"] == user:
            raise serializers.ValidationError({"recipient": "You cannot send a message to yourself."})
        # Parents and students write to the school, not to each other.
        if user.role not in STAFF and data["recipient"].role not in STAFF:
            raise serializers.ValidationError({"recipient": "You can only write to school staff."})
        reply_to = data.get("reply_to")
        if reply_to and user.id not in (reply_to.sender_id, reply_to.recipient_id):
            raise serializers.ValidationError({"reply_to": "You can only reply to your own messages."})
        return data
