"""
academics: what is taught, by whom, to which class, and when.

- Subject             "Mathematics"
- TeachingAssignment  "Mr Ncube teaches Mathematics to Form 1A in 2026".
                      Marks and attendance will hang off this later.
- Period              a slot in the school day, e.g. "Period 1, 07:30 - 08:10"
- TimetableEntry      puts one teaching assignment into one period on one weekday
"""
from django.conf import settings
from django.db import models

from apps.core.models import AcademicYear, TimeStamped
from apps.students.models import SchoolClass


class Subject(TimeStamped):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)  # short label for the timetable, e.g. "MATH"

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TeachingAssignment(TimeStamped):
    year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="teaching_assignments")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, related_name="teaching_assignments")
    subject = models.ForeignKey(Subject, on_delete=models.PROTECT, related_name="teaching_assignments")
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="teaching_assignments",
        limit_choices_to={"role": "teacher"},
    )

    class Meta:
        ordering = ["school_class__level", "school_class__name", "subject__name"]
        constraints = [
            # A class has one teacher per subject per year.
            models.UniqueConstraint(fields=["year", "school_class", "subject"], name="one_teacher_per_class_subject"),
        ]

    def __str__(self):
        return f"{self.subject} - {self.school_class} ({self.teacher})"


class Period(TimeStamped):
    name = models.CharField(max_length=50, unique=True)  # "Period 1", "Break"
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False, help_text="Breaks show on the timetable but hold no lessons.")

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.name} ({self.start_time:%H:%M}-{self.end_time:%H:%M})"


class TimetableEntry(TimeStamped):
    class Day(models.IntegerChoices):
        MONDAY = 1, "Monday"
        TUESDAY = 2, "Tuesday"
        WEDNESDAY = 3, "Wednesday"
        THURSDAY = 4, "Thursday"
        FRIDAY = 5, "Friday"

    assignment = models.ForeignKey(TeachingAssignment, on_delete=models.CASCADE, related_name="lessons")
    day = models.PositiveSmallIntegerField(choices=Day.choices)
    period = models.ForeignKey(Period, on_delete=models.PROTECT, related_name="lessons")
    room = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["day", "period__start_time"]

    def __str__(self):
        return f"{self.get_day_display()} {self.period.name}: {self.assignment}"
