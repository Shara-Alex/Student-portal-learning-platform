from rest_framework import serializers

from .models import Announcement, Event


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ["id", "title", "details", "start_date", "end_date", "kind", "audience"]

    def validate(self, data):
        start = data.get("start_date", getattr(self.instance, "start_date", None))
        end = data.get("end_date", getattr(self.instance, "end_date", None))
        if end and start and end < start:
            raise serializers.ValidationError({"end_date": "The end date cannot be before the start date."})
        return data


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = ["id", "title", "body", "audience", "pinned", "publish_until", "author_name", "created_at"]

    def get_author_name(self, obj):
        return str(obj.author) if obj.author else ""
