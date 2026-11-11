"""
students: who is in the school and which class they sit in.

- SchoolClass  a class group, e.g. "Form 1A". It lives on from year to year.
- Guardian     a parent / guardian. One guardian can have several children here.
- Student      the learner. Linked to one or more guardians.
- Enrolment    "this student is in this class for this academic year".
               Keeping it as its own table preserves class history when
               students move up each year.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import AcademicYear, TimeStamped


class SchoolClass(TimeStamped):
    name = models.CharField(max_length=50, unique=True)  # "Form 1A"
    level = models.PositiveSmallIntegerField(default=1, help_text="Grade / form number. Used for sorting.")
    class_teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="classes_taught",
        limit_choices_to={"role": "teacher"},
    )

    class Meta:
        ordering = ["level", "name"]
        verbose_name = "class"
        verbose_name_plural = "classes"

    def __str__(self):
        return self.name


class Guardian(TimeStamped):
    class Relationship(models.TextChoices):
        MOTHER = "mother", "Mother"
        FATHER = "father", "Father"
        GUARDIAN = "guardian", "Guardian"
        OTHER = "other", "Other"

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    relationship = models.CharField(max_length=20, choices=Relationship.choices, default=Relationship.GUARDIAN)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    # The guardian's portal login (a User with role=parent). Empty until they are given one.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guardian",
        limit_choices_to={"role": "parent"},
    )

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()


class Student(TimeStamped):
    class Gender(models.TextChoices):
        MALE = "M", "Male"
        FEMALE = "F", "Female"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        LEFT = "left", "Left"
        GRADUATED = "graduated", "Graduated"

    class BloodGroup(models.TextChoices):
        A_POS = "A+", "A+"
        A_NEG = "A-", "A-"
        B_POS = "B+", "B+"
        B_NEG = "B-", "B-"
        AB_POS = "AB+", "AB+"
        AB_NEG = "AB-", "AB-"
        O_POS = "O+", "O+"
        O_NEG = "O-", "O-"

    admission_number = models.CharField(max_length=30, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1, choices=Gender.choices)
    date_of_birth = models.DateField(null=True, blank=True)
    admission_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    address = models.TextField(blank=True)
    # Medical info: what staff need to know in an emergency.
    blood_group = models.CharField(max_length=3, choices=BloodGroup.choices, blank=True)
    allergies = models.TextField(blank=True)
    medical_notes = models.TextField(blank=True, help_text="Known conditions, medication, anything staff must know.")
    guardians = models.ManyToManyField(Guardian, related_name="students", blank=True)
    # The student's own portal login (a User with role=student). Empty until they are given one.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student",
        limit_choices_to={"role": "student"},
    )

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.full_name} ({self.admission_number})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def enrol(self, school_class, year):
        """Put the student in `school_class` for `year`. Passing None removes them from that year."""
        if school_class is None:
            self.enrolments.filter(year=year).delete()
            return None
        enrolment, _ = Enrolment.objects.update_or_create(
            student=self, year=year, defaults={"school_class": school_class}
        )
        return enrolment


class Enrolment(TimeStamped):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrolments")
    # PROTECT: a class that still has students in it cannot be deleted by accident.
    school_class = models.ForeignKey(SchoolClass, on_delete=models.PROTECT, related_name="enrolments")
    year = models.ForeignKey(AcademicYear, on_delete=models.PROTECT, related_name="enrolments")

    class Meta:
        ordering = ["-year__start_date"]
        constraints = [
            # A student sits in exactly one class per academic year.
            models.UniqueConstraint(fields=["student", "year"], name="one_class_per_student_per_year"),
        ]

    def __str__(self):
        return f"{self.student} - {self.school_class} ({self.year})"
