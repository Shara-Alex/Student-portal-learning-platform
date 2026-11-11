from datetime import date, time

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, User
from apps.students.models import SchoolClass

from .models import Period, Subject, TeachingAssignment, TimetableEntry


class AcademicsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin")
        self.banda = User.objects.create_user("banda", password="pass1234", role="teacher")
        self.ncube = User.objects.create_user("ncube", password="pass1234", role="teacher")
        self.year = AcademicYear.objects.create(
            name="2026", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True
        )
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)
        self.form2 = SchoolClass.objects.create(name="Form 2A", level=2)
        self.maths = Subject.objects.create(name="Mathematics", code="MATH")
        self.english = Subject.objects.create(name="English", code="ENG")
        self.p1 = Period.objects.create(name="Period 1", start_time=time(7, 30), end_time=time(8, 10))
        self.tea = Period.objects.create(name="Break", start_time=time(10, 0), end_time=time(10, 20), is_break=True)
        self.client.force_authenticate(self.admin)

    def assign(self, school_class, subject, teacher):
        body = {"school_class": school_class.id, "subject": subject.id, "teacher": teacher.id}
        return self.client.post("/api/academics/assignments/", body, format="json")

    def lesson(self, assignment_id, day=1, period=None):
        body = {"assignment": assignment_id, "day": day, "period": (period or self.p1).id}
        return self.client.post("/api/academics/timetable/", body, format="json")

    def test_assignment_defaults_to_current_year(self):
        r = self.assign(self.form1, self.maths, self.banda)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["year"], self.year.id)
        self.assertEqual(r.data["subject_code"], "MATH")

    def test_one_teacher_per_class_subject(self):
        self.assign(self.form1, self.maths, self.banda)
        self.assertEqual(self.assign(self.form1, self.maths, self.ncube).status_code, 400)

    def test_only_teachers_can_be_assigned(self):
        self.assertEqual(self.assign(self.form1, self.maths, self.admin).status_code, 400)

    def test_class_cannot_have_two_lessons_in_one_slot(self):
        maths = self.assign(self.form1, self.maths, self.banda).data["id"]
        english = self.assign(self.form1, self.english, self.ncube).data["id"]
        self.assertEqual(self.lesson(maths).status_code, 201)
        r = self.lesson(english)
        self.assertEqual(r.status_code, 400)
        self.assertIn("already has Mathematics", str(r.data))

    def test_teacher_cannot_be_in_two_classes_at_once(self):
        a = self.assign(self.form1, self.maths, self.banda).data["id"]
        b = self.assign(self.form2, self.maths, self.banda).data["id"]
        self.lesson(a)
        r = self.lesson(b)
        self.assertEqual(r.status_code, 400)
        self.assertIn("already teaching Form 1A", str(r.data))
        self.assertEqual(self.lesson(b, day=2).status_code, 201)  # a different day is fine

    def test_no_lessons_in_a_break(self):
        a = self.assign(self.form1, self.maths, self.banda).data["id"]
        self.assertEqual(self.lesson(a, period=self.tea).status_code, 400)

    def test_moving_a_lesson_does_not_clash_with_itself(self):
        a = self.assign(self.form1, self.maths, self.banda).data["id"]
        entry = self.lesson(a).data["id"]
        r = self.client.patch(f"/api/academics/timetable/{entry}/", {"room": "Lab 1"}, format="json")
        self.assertEqual(r.status_code, 200, r.data)

    def test_teacher_sees_own_timetable_and_cannot_edit(self):
        a = self.assign(self.form1, self.maths, self.banda).data["id"]
        b = self.assign(self.form2, self.english, self.ncube).data["id"]
        self.lesson(a)
        self.lesson(b, day=2)
        self.client.force_authenticate(self.banda)
        mine = self.client.get("/api/academics/timetable/?teacher=me").data
        self.assertEqual([e["school_class_name"] for e in mine], ["Form 1A"])
        by_class = self.client.get(f"/api/academics/timetable/?school_class={self.form2.id}").data
        self.assertEqual([e["subject_code"] for e in by_class], ["ENG"])
        self.assertEqual(self.lesson(a, day=3).status_code, 403)

    def test_period_times_and_protected_delete(self):
        body = {"name": "Bad", "start_time": "09:00", "end_time": "08:00"}
        self.assertEqual(self.client.post("/api/academics/periods/", body, format="json").status_code, 400)
        self.assign(self.form1, self.maths, self.banda)
        self.assertEqual(self.client.delete(f"/api/academics/subjects/{self.maths.id}/").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/academics/subjects/{self.english.id}/").status_code, 204)
