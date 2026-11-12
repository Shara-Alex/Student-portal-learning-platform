from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, Term, User
from apps.students.models import Guardian, SchoolClass, Student

from .models import AttendanceRecord


class AttendanceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        today = timezone.localdate()
        self.today = today
        self.admin = User.objects.create_user("admin", password="x", role="admin")
        self.banda = User.objects.create_user("banda", password="x", role="teacher")
        self.ncube = User.objects.create_user("ncube", password="x", role="teacher")
        self.parent = User.objects.create_user("parent", password="x", role="parent")
        self.stranger = User.objects.create_user("stranger", password="x", role="parent")
        self.year = AcademicYear.objects.create(name="Y", start_date=today - timedelta(days=100), end_date=today + timedelta(days=100), is_current=True)
        self.term = Term.objects.create(year=self.year, name="T", start_date=today - timedelta(days=30), end_date=today + timedelta(days=30), is_current=True)
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1, class_teacher=self.banda)
        self.tino = Student.objects.create(admission_number="S1", first_name="Tino", last_name="Moyo", gender="M")
        self.rudo = Student.objects.create(admission_number="S2", first_name="Rudo", last_name="Dube", gender="F")
        for s in (self.tino, self.rudo):
            s.enrol(self.form1, self.year)
        self.tino.guardians.add(Guardian.objects.create(first_name="Mary", last_name="Moyo", user=self.parent))
        self.url = f"/api/attendance/register/?school_class={self.form1.id}"
        self.client.force_authenticate(self.banda)

    def mark(self, entries, day=None):
        body = {"entries": [{"student": s.id, "status": status} for s, status in entries]}
        return self.client.post(self.url + (f"&date={day}" if day else ""), body, format="json")

    def test_everyone_starts_present_and_register_saves(self):
        sheet = self.client.get(self.url).data
        self.assertFalse(sheet["submitted"])
        self.assertEqual([(r["full_name"], r["status"]) for r in sheet["rows"]], [("Rudo Dube", "P"), ("Tino Moyo", "P")])
        r = self.mark([(self.tino, "A"), (self.rudo, "P")])
        self.assertEqual(r.status_code, 200, r.data)
        self.assertTrue(r.data["submitted"])
        self.mark([(self.tino, "L"), (self.rudo, "P")])  # correcting it updates, never duplicates
        self.assertEqual(AttendanceRecord.objects.count(), 2)
        self.assertEqual(AttendanceRecord.objects.get(student=self.tino).status, "L")

    def test_who_may_mark_and_when(self):
        self.assertEqual(self.mark([(self.tino, "P")], day=self.today + timedelta(days=1)).status_code, 400)  # the future
        self.client.force_authenticate(self.ncube)  # does not teach this class
        self.assertEqual(self.mark([(self.tino, "P")]).status_code, 403)
        self.client.force_authenticate(self.parent)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_my_registers_shows_what_is_left_to_do(self):
        self.assertEqual(self.client.get("/api/attendance/my-registers/").data, [
            {"school_class": self.form1.id, "name": "Form 1A", "students": 2, "submitted": False}
        ])
        self.mark([(self.tino, "P"), (self.rudo, "P")])
        self.assertTrue(self.client.get("/api/attendance/my-registers/").data[0]["submitted"])
        self.client.force_authenticate(self.ncube)  # not a class teacher: nothing to mark
        self.assertEqual(self.client.get("/api/attendance/my-registers/").data, [])

    def test_summary_and_parent_view(self):
        yesterday = self.today - timedelta(days=1)
        self.mark([(self.tino, "A"), (self.rudo, "P")], day=yesterday)
        self.mark([(self.tino, "L"), (self.rudo, "P")])
        rows = self.client.get(f"/api/attendance/summary/?school_class={self.form1.id}&term={self.term.id}").data
        tino = next(r for r in rows if r["full_name"] == "Tino Moyo")
        self.assertEqual((tino["present"], tino["late"], tino["absent"], tino["percent"]), (0, 1, 1, 50.0))

        url = f"/api/attendance/student/?student={self.tino.id}&term={self.term.id}"
        self.client.force_authenticate(self.parent)
        r = self.client.get(url)
        self.assertEqual((r.data["absent"], len(r.data["recent"])), (1, 2))
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(url).status_code, 403)
