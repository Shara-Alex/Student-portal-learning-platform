"""Questions other modules keep asking about students, answered in one place."""
from apps.core.models import AcademicYear

from .models import Student


def class_students(school_class, year):
    """Active students enrolled in a class for a year, in register order."""
    return Student.objects.filter(
        status=Student.Status.ACTIVE, enrolments__school_class=school_class, enrolments__year=year
    ).order_by("last_name", "first_name")


def year_for(day):
    """The academic year a date falls in (or the current one if it falls in none)."""
    return (
        AcademicYear.objects.filter(start_date__lte=day, end_date__gte=day).first()
        or AcademicYear.objects.filter(is_current=True).first()
    )
