from collections import defaultdict

from apps.academics.models import TeachingAssignment

from .models import AttendanceRecord


def can_mark(user, school_class):
    """Admins, the class teacher, and any teacher who teaches that class may mark its register."""
    if user.role == "admin":
        return True
    if user.role != "teacher":
        return False
    return school_class.class_teacher_id == user.id or TeachingAssignment.objects.filter(
        school_class=school_class, teacher=user, year__is_current=True
    ).exists()


def tally(records):
    """records -> {student_id: {"present", "late", "absent", "days", "percent"}}"""
    counts = defaultdict(lambda: {"present": 0, "late": 0, "absent": 0})
    names = {"P": "present", "L": "late", "A": "absent"}
    for student_id, status in records:
        counts[student_id][names[status]] += 1
    for figures in counts.values():
        figures["days"] = figures["present"] + figures["late"] + figures["absent"]
        # Late still counts as attended.
        figures["percent"] = round(100 * (figures["present"] + figures["late"]) / figures["days"], 1)
    return counts


EMPTY = {"present": 0, "late": 0, "absent": 0, "days": 0, "percent": None}


def student_summary(student, term):
    records = AttendanceRecord.objects.filter(student=student, date__range=(term.start_date, term.end_date))
    figures = tally(records.values_list("student_id", "status")).get(student.id, EMPTY)
    recent = records.exclude(status="P")[:10]
    return {**figures, "recent": [{"date": r.date, "status": r.status, "note": r.note} for r in recent]}
