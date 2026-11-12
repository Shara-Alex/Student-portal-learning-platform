"""
python manage.py seed_demo

Fills an EMPTY database with a small made-up school so the app can be tried
straight away: one admin, three teachers, one parent, a year with three terms,
classes, students, subjects, a school day, a timetable, a fee structure,
a few calendar events and notices, and one application waiting in admissions.

For local testing only. It refuses to run if there are already students.
"""
from datetime import date, time, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.academics.models import Period, Subject, TeachingAssignment, TimetableEntry
from apps.admissions.models import Application
from apps.core.models import AcademicYear, School, Term, User
from apps.events.models import Announcement, Event
from apps.fees.models import Fee
from apps.students.models import Guardian, SchoolClass, Student

PASSWORD = "demo12345"  # the same for every demo login; change it before showing anyone real data

TEACHERS = [("banda", "Grace", "Banda"), ("ncube", "Peter", "Ncube"), ("phiri", "Ruth", "Phiri")]
CLASSES = [("Form 1A", 1), ("Form 1B", 1), ("Form 2A", 2)]
SUBJECTS = [
    ("Mathematics", "MATH", "maths"), ("English", "ENG", "english"), ("Science", "SCI", "science"),
    ("History", "HIST", "humanities"), ("Shona", "SHO", "languages"), ("Agriculture", "AGR", "practical"),
]
PERIODS = [
    ("Period 1", (7, 30), (8, 10), False), ("Period 2", (8, 10), (8, 50), False),
    ("Period 3", (8, 50), (9, 30), False), ("Break", (9, 30), (9, 50), True),
    ("Period 4", (9, 50), (10, 30), False), ("Period 5", (10, 30), (11, 10), False),
]
# first name, last name, gender, index of the class in CLASSES
STUDENTS = [
    ("Tariro", "Moyo", "F", 0), ("Blessing", "Dube", "F", 0), ("Nomsa", "Khumalo", "F", 0), ("Tendai", "Ncube", "M", 0),
    ("Kudzai", "Sibanda", "M", 1), ("Rudo", "Chirwa", "F", 1), ("Farai", "Mlambo", "M", 1),
    ("Tinashe", "Moyo", "M", 2), ("Tapiwa", "Zulu", "M", 2),
]


class Command(BaseCommand):
    help = "Fill an empty database with a small demo school (local testing only)."

    @transaction.atomic
    def handle(self, *args, **options):
        if Student.objects.exists():
            raise CommandError("There are already students in this database. seed_demo only runs on an empty one.")

        today = date.today()
        if not School.objects.exists():
            School.objects.create(name="Riverside High School")
        if not User.objects.filter(username="admin").exists():
            User.objects.create_superuser("admin", password=PASSWORD, role="admin", first_name="Demo", last_name="Admin")
        teachers = [
            User.objects.create_user(username, password=PASSWORD, role="teacher", first_name=first, last_name=last)
            for username, first, last in TEACHERS
        ]
        parent = User.objects.create_user("parent", password=PASSWORD, role="parent", first_name="Mary", last_name="Moyo")
        User.objects.create_user("bursar", password=PASSWORD, role="bursar", first_name="Tatenda", last_name="Chari")
        User.objects.create_user("office", password=PASSWORD, role="front_office", first_name="Linda", last_name="Sithole")

        # This calendar year, split into three terms. Whichever term today falls in is the current one.
        year = AcademicYear.objects.create(
            name=str(today.year), start_date=date(today.year, 1, 13), end_date=date(today.year, 12, 4), is_current=True
        )
        AcademicYear.objects.create(
            name=str(today.year + 1), start_date=date(today.year + 1, 1, 12), end_date=date(today.year + 1, 12, 3)
        )
        spans = [("Term 1", (1, 13), (4, 9)), ("Term 2", (5, 5), (8, 6)), ("Term 3", (9, 8), (12, 4))]
        terms = [
            Term.objects.create(year=year, name=name, start_date=date(today.year, *start), end_date=date(today.year, *end))
            for name, start, end in spans
        ]
        current = next((t for t in terms if t.start_date <= today <= t.end_date), None)
        current = current or next((t for t in terms if t.start_date > today), terms[-1])  # in a holiday: the next term
        current.is_current = True
        current.save()

        classes = [
            SchoolClass.objects.create(name=name, level=level, class_teacher=teachers[i])
            for i, (name, level) in enumerate(CLASSES)
        ]
        moyo = Guardian.objects.create(first_name="Mary", last_name="Moyo", relationship="mother", phone="+263 77 555 0100", user=parent)
        for number, (first, last, gender, class_index) in enumerate(STUDENTS, start=1):
            student = Student.objects.create(
                admission_number=f"RHS-{today.year}{number:03d}", first_name=first, last_name=last, gender=gender,
                date_of_birth=date(today.year - 14, 3, number),
            )
            student.enrol(classes[class_index], year)
            student.guardians.add(
                moyo if last == "Moyo" else Guardian.objects.create(first_name=f"Parent of {first}", last_name=last, phone=f"+263 77 555 01{number:02d}")
            )

        subjects = [Subject.objects.create(name=name, code=code, group=group) for name, code, group in SUBJECTS]
        periods = [
            Period.objects.create(name=name, start_time=time(*start), end_time=time(*end), is_break=is_break)
            for name, start, end, is_break in PERIODS
        ]
        lessons = [p for p in periods if not p.is_break]

        # Every class takes every subject; the three teachers share them out.
        # Each class's week is the same pattern shifted along so no teacher is in two places.
        # The last period on Friday is left free in every class, so there is a gap to fill in by hand.
        for class_index, school_class in enumerate(classes):
            taught = [
                TeachingAssignment.objects.create(year=year, school_class=school_class, subject=subject, teacher=teachers[i % 3])
                for i, subject in enumerate(subjects)
            ]
            for day in range(1, 6):
                for slot, period in enumerate(lessons):
                    if day == 5 and period == lessons[-1]:
                        continue
                    assignment = taught[(day + slot + class_index * 2) % len(taught)]
                    busy = TimetableEntry.objects.filter(day=day, period=period, assignment__teacher=assignment.teacher).exists()
                    if not busy:
                        TimetableEntry.objects.create(assignment=assignment, day=day, period=period)

        # Fees for the current term: tuition per class, and a levy everyone pays.
        for school_class in classes:
            Fee.objects.create(term=current, school_class=school_class, name="Tuition", amount=400 + 50 * school_class.level)
        Fee.objects.create(term=current, school_class=None, name="Sports levy", amount=30)

        admin = User.objects.get(username="admin")
        Event.objects.create(title="Parents' evening", start_date=today + timedelta(days=6), kind="meeting")
        Event.objects.create(title="End of term exams", start_date=today + timedelta(days=14), end_date=today + timedelta(days=21), kind="exam")
        Event.objects.create(title="Staff planning meeting", start_date=today + timedelta(days=2), kind="meeting", audience="staff")
        Announcement.objects.create(title="Fees are due", body="Please settle this term's fees at the school office.", pinned=True, author=admin)
        Announcement.objects.create(title="Marks deadline", body="All coursework marks must be entered before the exams start.", audience="staff", author=admin)

        Application.objects.create(
            first_name="Chipo", last_name="Banda", gender="F", date_of_birth=date(today.year - 13, 6, 14), applying_for="Form 1",
            previous_school="Hillside Primary", guardian_first_name="Joseph", guardian_last_name="Banda",
            guardian_relationship="father", guardian_phone="+263 77 555 0199",
        )

        self.stdout.write(self.style.SUCCESS("Demo school created."))
        self.stdout.write(f"  Password for every demo login: {PASSWORD}")
        self.stdout.write("  admin   (administrator: can change everything; also opens /admin)")
        self.stdout.write("  banda   (teacher: Mathematics and History)")
        self.stdout.write("  ncube   (teacher: English and Shona)")
        self.stdout.write("  phiri   (teacher: Science and Agriculture)")
        self.stdout.write("  bursar  (bursar: fees only)")
        self.stdout.write("  office  (front office: students and admissions)")
        self.stdout.write("  parent  (parent of Tariro and Tinashe Moyo: sees only her own children)")
