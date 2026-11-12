"""
core: the foundation every other module depends on.

- School        the single school this instance serves (like res.company in Odoo)
- User          one login table for everyone, with a `role`
- AcademicYear  e.g. 2026
- Term          e.g. Term 1 of 2026; marks, attendance and fees hang off a term
"""
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.db import models


class TimeStamped(models.Model):
    """Abstract base: gives every table created/updated timestamps for free."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


def default_time_zone():
    """New schools start in the server's zone (TIME_ZONE in settings.py)."""
    return settings.TIME_ZONE


class School(TimeStamped):
    name = models.CharField(max_length=200)
    motto = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    logo = models.ImageField(upload_to="school/", blank=True, null=True)
    currency = models.CharField(max_length=3, default="USD")
    # An IANA zone name such as "Africa/Harare" or "Africa/Lusaka". The frontend shows clocks and "today" in it.
    time_zone = models.CharField(max_length=64, default=default_time_zone)

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
        BURSAR = "bursar", "Bursar"
        FRONT_OFFICE = "front_office", "Front office"
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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            # There is only ever one current year. Making this one current retires the others,
            # and any "current term" left behind in another year.
            AcademicYear.objects.exclude(pk=self.pk).filter(is_current=True).update(is_current=False)
            Term.objects.exclude(year=self).filter(is_current=True).update(is_current=False)


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

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_current:
            # One current term, and it always sits inside the current year.
            Term.objects.exclude(pk=self.pk).filter(is_current=True).update(is_current=False)
            if not self.year.is_current:
                self.year.is_current = True
                self.year.save()
