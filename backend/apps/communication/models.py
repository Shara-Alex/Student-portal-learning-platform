"""
communication: private messages inside the app, like a very small email.

One Message = one person writing to one other person. A reply points back at
the message it answers.
"""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStamped


class Message(TimeStamped):
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_messages")
    subject = models.CharField(max_length=150)
    body = models.TextField()
    read_at = models.DateTimeField(null=True, blank=True)  # empty = not opened yet
    reply_to = models.ForeignKey("self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.recipient}: {self.subject}"
