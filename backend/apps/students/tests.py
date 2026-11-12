from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, User

from .models import Enrolment, Guardian, SchoolClass, Student


class StudentsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin")
        self.teacher = User.objects.create_user("teacher", password="pass1234", role="teacher")
        self.parent = User.objects.create_user("parent", password="pass1234", role="parent")
        self.year = AcademicYear.objects.create(
            name="2026", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True
        )
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)
        self.form2 = SchoolClass.objects.create(name="Form 2A", level=2)
        self.guardian = Guardian.objects.create(first_name="Mary", last_name="Moyo", user=self.parent)

    def login(self, user):
        self.client.force_authenticate(user)

    def new_student(self, **extra):
        data = {"admission_number": "S001", "first_name": "Tino", "last_name": "Moyo", "gender": "M"}
        data.update(extra)
        return self.client.post("/api/students/students/", data, format="json")

    def test_admin_creates_student_with_class_and_guardian(self):
        self.login(self.admin)
        r = self.new_student(school_class=self.form1.id, guardians=[self.guardian.id])
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["current_class_name"], "Form 1A")
        self.assertEqual(r.data["guardian_details"][0]["full_name"], "Mary Moyo")
        self.assertEqual(Enrolment.objects.count(), 1)

    def test_changing_class_updates_the_same_enrolment(self):
        self.login(self.admin)
        student_id = self.new_student(school_class=self.form1.id).data["id"]
        r = self.client.patch(f"/api/students/students/{student_id}/", {"school_class": self.form2.id}, format="json")
        self.assertEqual(r.data["current_class_name"], "Form 2A")
        self.assertEqual(Enrolment.objects.count(), 1)  # moved, not duplicated

    def test_editing_other_fields_leaves_class_alone(self):
        self.login(self.admin)
        student_id = self.new_student(school_class=self.form1.id).data["id"]
        r = self.client.patch(f"/api/students/students/{student_id}/", {"status": "left"}, format="json")
        self.assertEqual(r.data["current_class_name"], "Form 1A")

    def test_class_needs_a_current_year(self):
        self.year.is_current = False
        self.year.save()
        self.login(self.admin)
        r = self.new_student(school_class=self.form1.id)
        self.assertEqual(r.status_code, 400)
        self.assertFalse(Student.objects.exists())  # the transaction rolled the student back

    def test_teacher_can_read_but_not_write(self):
        self.login(self.teacher)
        self.assertEqual(self.client.get("/api/students/students/").status_code, 200)
        self.assertEqual(self.client.get("/api/students/guardians/").status_code, 200)
        self.assertEqual(self.new_student().status_code, 403)

    def test_parent_sees_only_own_children(self):
        mine = Student.objects.create(admission_number="S001", first_name="Tino", last_name="Moyo", gender="M")
        mine.guardians.add(self.guardian)
        Student.objects.create(admission_number="S002", first_name="Other", last_name="Child", gender="F")
        self.login(self.parent)
        r = self.client.get("/api/students/students/")
        self.assertEqual([s["admission_number"] for s in r.data["results"]], ["S001"])
        self.assertEqual(self.client.get("/api/students/guardians/").status_code, 403)

    def test_filter_and_search(self):
        self.login(self.admin)
        self.new_student(school_class=self.form1.id)
        self.new_student(admission_number="S002", first_name="Rudo", school_class=self.form2.id)
        r = self.client.get(f"/api/students/students/?school_class={self.form2.id}")
        self.assertEqual([s["first_name"] for s in r.data["results"]], ["Rudo"])
        r = self.client.get("/api/students/students/?search=tino")
        self.assertEqual(r.data["count"], 1)

    def test_class_student_count_and_protected_delete(self):
        self.login(self.admin)
        self.new_student(school_class=self.form1.id)
        classes = {c["name"]: c for c in self.client.get("/api/students/classes/").data}
        self.assertEqual(classes["Form 1A"]["student_count"], 1)
        self.assertEqual(classes["Form 2A"]["student_count"], 0)
        self.assertEqual(self.client.delete(f"/api/students/classes/{self.form1.id}/").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/students/classes/{self.form2.id}/").status_code, 204)

    def test_teacher_list_for_class_teacher_dropdown(self):
        self.login(self.admin)
        r = self.client.get("/api/core/users/?role=teacher")
        self.assertEqual([u["username"] for u in r.data["results"]], ["teacher"])
        self.login(self.parent)
        self.assertEqual(self.client.get("/api/core/users/").status_code, 403)

    def test_medical_fields_are_saved(self):
        self.login(self.admin)
        r = self.new_student(blood_group="O+", allergies="Peanuts")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["blood_group"], "O+")
        self.assertEqual(r.data["allergies"], "Peanuts")

    def test_promote_class_to_next_year(self):
        next_year = AcademicYear.objects.create(name="2027", start_date=date(2027, 1, 1), end_date=date(2027, 12, 31))
        self.login(self.admin)
        a = self.new_student(school_class=self.form1.id).data["id"]
        b = self.new_student(admission_number="S002", school_class=self.form1.id).data["id"]
        # Promote only student a; student b is repeating the year.
        body = {"from_class": self.form1.id, "to_year": next_year.id, "to_class": self.form2.id, "students": [a]}
        r = self.client.post("/api/students/enrolments/promote/", body, format="json")
        self.assertEqual(r.data, {"promoted": 1, "graduated": 0})
        self.assertTrue(Enrolment.objects.filter(student_id=a, year=next_year, school_class=self.form2).exists())
        self.assertFalse(Enrolment.objects.filter(student_id=b, year=next_year).exists())
        # This year's record is kept as history.
        self.assertTrue(Enrolment.objects.filter(student_id=a, year=self.year, school_class=self.form1).exists())

    def test_promote_without_class_graduates(self):
        next_year = AcademicYear.objects.create(name="2027", start_date=date(2027, 1, 1), end_date=date(2027, 12, 31))
        self.login(self.admin)
        a = self.new_student(school_class=self.form2.id).data["id"]
        body = {"from_class": self.form2.id, "to_year": next_year.id, "to_class": None}
        r = self.client.post("/api/students/enrolments/promote/", body, format="json")
        self.assertEqual(r.data, {"promoted": 0, "graduated": 1})
        self.assertEqual(Student.objects.get(pk=a).status, "graduated")

    def test_promote_rules(self):
        self.login(self.admin)
        body = {"from_class": self.form1.id, "to_year": self.year.id, "to_class": self.form2.id}
        self.assertEqual(self.client.post("/api/students/enrolments/promote/", body, format="json").status_code, 400)
        self.login(self.teacher)
        self.assertEqual(self.client.post("/api/students/enrolments/promote/", body, format="json").status_code, 403)

    def test_admin_gives_a_guardian_and_a_student_a_login(self):
        self.login(self.admin)
        fresh = Guardian.objects.create(first_name="John", last_name="Dube")
        url = f"/api/students/guardians/{fresh.id}/login/"
        self.assertEqual(self.client.post(url, {"username": "jdube", "password": "short"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"username": "parent", "password": "a-long-enough-one"}).status_code, 400)  # taken
        r = self.client.post(url, {"username": "jdube", "password": "a-long-enough-one"})
        self.assertEqual((r.status_code, r.data["username"]), (200, "jdube"))
        self.assertEqual(User.objects.get(username="jdube").role, "parent")
        self.assertEqual(self.client.post(url, {"username": "again", "password": "a-long-enough-one"}).status_code, 400)

        student_id = self.new_student().data["id"]
        r = self.client.post(f"/api/students/students/{student_id}/login/", {"username": "tino", "password": "a-long-enough-one"})
        self.assertEqual((r.data["username"], User.objects.get(username="tino").role), ("tino", "student"))
        self.login(self.teacher)
        self.assertEqual(self.client.post(url, {"username": "x", "password": "a-long-enough-one"}).status_code, 403)
