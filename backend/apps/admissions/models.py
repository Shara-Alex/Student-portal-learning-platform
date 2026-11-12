"""
admissions: applications for a place at the school.

A family fills in the public form (no login needed). Staff move the
application through its stages, and "Enrol" turns it into a real Student and
Guardian in one step.
"""
from django.db import models

from apps.core.models import TimeStamped
from apps.students.models import Guardian, Student


class Application(TimeStamped):
    class Status(models.TextChoices):
        APPLIED = "applied", "Applied"
        INTERVIEW = "interview", "Interview"
        OFFERED = "offered", "Offered"
        ENROLLED = "enrolled", "Enrolled"
        DECLINED = "declined", "Declined"

    # The child
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=Student.Gender.choices)
    date_of_birth = models.DateField()
    applying_for = models.CharField(max_length=50, help_text='The class or form wanted, e.g. "Form 1".')
    previous_school = models.CharField(max_length=150, blank=True)
    reason_for_transfer = models.TextField(blank=True)
    medical_notes = models.TextField(blank=True)
    # The parent or guardian
    guardian_first_name = models.CharField(max_length=100)
    guardian_last_name = models.CharField(max_length=100)
    guardian_relationship = models.CharField(max_length=20, choices=Guardian.Relationship.choices, default=Guardian.Relationship.GUARDIAN)
    guardian_phone = models.CharField(max_length=50)
    guardian_email = models.EmailField(blank=True)
    # One supporting document: birth certificate, last school report...
    document = models.FileField(upload_to="admissions/", blank=True)
    # Filled in by staff
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.APPLIED)
    notes = models.TextField(blank=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name="applications")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.applying_for})"
