"""
notifications: messages the school sends OUT to families and staff.

(Messages people write to each other inside the app are the communication module.)

- Notification          one message to one person: an email today, WhatsApp later.
                        Every message is saved here first ("queued"), then sent.
                        So nothing is lost if the mail server is down, and the
                        school has a record of what was sent to whom.
- NotificationSettings  which automatic messages are switched on. One row only.
"""
from django.db import models

from apps.core.models import TimeStamped
from apps.students.models import Student


class NotificationSettings(TimeStamped):
    """One row only."""

    absence = models.BooleanField(default=True, help_text="Email guardians when their child is marked absent.")
    payment = models.BooleanField(default=True, help_text="Email guardians a receipt when a payment is recorded.")
    notice = models.BooleanField(default=True, help_text="Email new notices to the people they are for.")

    @classmethod
    def current(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row


class Notification(TimeStamped):
    class Kind(models.TextChoices):
        ABSENCE = "absence", "Absence"
        FEE_REMINDER = "fee_reminder", "Fee reminder"
        PAYMENT = "payment", "Payment receipt"
        NOTICE = "notice", "Notice"

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        # WHATSAPP = "whatsapp", "WhatsApp"   <- add here, and a sender in channels.py

    class Status(models.TextChoices):
        PENDING = "pending", "Waiting to be sent"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    kind = models.CharField(max_length=20, choices=Kind.choices)
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.EMAIL)
    to = models.CharField(max_length=254)  # an email address (a phone number once WhatsApp exists)
    recipient_name = models.CharField(max_length=200, blank=True)
    # Which student it is about, if any. Kept empty for notices.
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    subject = models.CharField(max_length=200)
    body = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    attempts = models.PositiveSmallIntegerField(default=0)
    sent_at = models.DateTimeField(null=True, blank=True)
    error = models.CharField(max_length=300, blank=True)
    # A label that makes a message unique, e.g. "absence:12:2026-11-12:mary@example.com".
    # The database refuses a second row with the same label, so nobody is told the same thing twice.
    dedupe_key = models.CharField(max_length=200, unique=True, null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"{self.get_kind_display()} to {self.to} ({self.status})"
