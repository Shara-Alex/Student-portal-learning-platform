"""
audit: who changed what, and when, for the things a school argues about later:
marks, money, and who may sign in.

- AuditEntry  one change. It is written inside the same database transaction as the
              change itself, so if the change is rolled back the entry goes with it,
              and there is never an entry for a change that did not happen.

Entries are never edited or deleted through the app: the model refuses, the API is
read-only and /admin shows them read-only. That is what makes the trail worth trusting.
"""
from django.conf import settings
from django.db import models

from apps.students.models import Student


class AuditEntry(models.Model):
    class Action(models.TextChoices):
        MARK_CHANGED = "mark_changed", "Mark changed"
        ASSESSMENT_DELETED = "assessment_deleted", "Assessment deleted"
        PAYMENT_RECORDED = "payment_recorded", "Payment recorded"
        PAYMENT_DELETED = "payment_deleted", "Payment deleted"
        INVOICE_DELETED = "invoice_deleted", "Invoice deleted"
        USER_CREATED = "user_created", "User added"
        USER_CHANGED = "user_changed", "User changed"
        PASSWORD_SET = "password_set", "Password set by an administrator"
        LOGIN_CREATED = "login_created", "Family login created"

    at = models.DateTimeField(auto_now_add=True, db_index=True)
    # Who did it. The name and role are copied in as well, so the entry still reads
    # correctly after that person is renamed or their role changes.
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    actor_name = models.CharField(max_length=200)
    actor_role = models.CharField(max_length=20, blank=True)
    action = models.CharField(max_length=30, choices=Action.choices, db_index=True)
    # What it was done to: "mark" 512, "payment" 37, "user" 4. A plain number, not a foreign key,
    # because the thing may since have been deleted and the entry must survive it.
    target_type = models.CharField(max_length=30)
    target_id = models.PositiveIntegerField(null=True, blank=True)
    summary = models.CharField(max_length=300)  # one sentence a person can read
    changes = models.JSONField(default=dict, blank=True)  # {"score": ["45", "54"]}: old and new
    # Which student it concerns, if any, so a student's whole history is one filter away.
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_entries")

    class Meta:
        ordering = ["-at", "-id"]
        verbose_name_plural = "audit entries"
        indexes = [models.Index(fields=["target_type", "target_id"])]

    def __str__(self):
        return f"{self.at:%Y-%m-%d %H:%M} {self.actor_name}: {self.summary}"

    def save(self, *args, **kwargs):
        if not self._state.adding:  # _state.adding is True only for a row not yet in the database
            raise ValueError("Audit entries cannot be changed once written.")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValueError("Audit entries cannot be deleted.")
