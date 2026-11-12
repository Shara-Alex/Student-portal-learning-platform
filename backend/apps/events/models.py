"""
events: the school calendar and the notice board.

- Event         something with a date: sports day, exams, a holiday, a parents' meeting.
- Announcement  a notice shown on the home screen until it expires.

Both have an audience: everyone, or staff only.
"""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStamped


class Audience(models.TextChoices):
    EVERYONE = "everyone", "Everyone"
    STAFF = "staff", "Staff only"


class Event(TimeStamped):
    class Kind(models.TextChoices):
        EVENT = "event", "Event"
        EXAM = "exam", "Exams"
        HOLIDAY = "holiday", "Holiday"
        MEETING = "meeting", "Meeting"
        SPORT = "sport", "Sport"

    title = models.CharField(max_length=150)
    details = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)  # empty = a one-day event
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.EVENT)
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.EVERYONE)

    class Meta:
        ordering = ["start_date"]

    def __str__(self):
        return f"{self.start_date} {self.title}"


class Announcement(TimeStamped):
    title = models.CharField(max_length=150)
    body = models.TextField()
    audience = models.CharField(max_length=20, choices=Audience.choices, default=Audience.EVERYONE)
    pinned = models.BooleanField(default=False, help_text="Pinned notices stay at the top.")
    publish_until = models.DateField(null=True, blank=True, help_text="Leave empty to show it until it is deleted.")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["-pinned", "-created_at"]

    def __str__(self):
        return self.title
