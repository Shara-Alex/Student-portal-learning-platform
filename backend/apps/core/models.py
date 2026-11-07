"""
core: the foundation every other module depends on.

- School        the single school this instance serves (like res.company in Odoo)
- User          one login table for everyone, with a `role`
- AcademicYear  e.g. 2026
- Term          e.g. Term 1 of 2026; marks, attendance and fees hang off a term
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class TimeStamped(models.Model):
    """Abstract base: gives every table created/updated timestamps for free."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class School(TimeStamped):
    name = models.CharField(max_length=200)
    motto = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="school/", blank=True, null=True)
    currency = models.CharField(max_length=3, default="USD")

    def __str__(self):
        return self.name

    @classmethod
    def current(cls):
        """One instance == one school, so there is only ever one row."""
        return cls.objects.first()


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "admin", "Administrator"
        TEACHER = "teacher", "Teacher"
        PARENT = "parent", "Parent / Guardian"
        STUDENT = "student", "Student"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    phone = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.get_full_name() or self.username


class AcademicYear(TimeStamped):
    name = models.CharField(max_length=20, unique=True)  # "2026"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name


class Term(TimeStamped):
    year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name="terms")
    name = models.CharField(max_length=50)  # "Term 1"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)

    class Meta:
        ordering = ["start_date"]
        unique_together = [("year", "name")]

    def __str__(self):
        return f"{self.name} {self.year}"
