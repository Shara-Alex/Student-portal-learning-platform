"""
attendance: the daily register.

One row per student per school day: Present, Late or Absent. A teacher marks
the whole class in one go, and only has to tap the exceptions.
"""
from django.conf import settings
from django.db import models

from apps.core.models import TimeStamped
from apps.students.models import SchoolClass, Student


class AttendanceRecord(TimeStamped):
    class Status(models.TextChoices):
        PRESENT = "P", "Present"
        LATE = "L", "Late"
        ABSENT = "A", "Absent"

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="attendance")
    # The class they were in that day. Kept so old registers still make sense after promotion.
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="attendance")
    date = models.DateField()
    status = models.CharField(max_length=1, choices=Status.choices, default=Status.PRESENT)
    note = models.CharField(max_length=200, blank=True)
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["-date"]
        constraints = [
            models.UniqueConstraint(fields=["student", "date"], name="one_attendance_mark_per_student_per_day"),
        ]

    def __str__(self):
        return f"{self.date} {self.student}: {self.get_status_display()}"
