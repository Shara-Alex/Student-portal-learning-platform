import shutil
import tempfile
from datetime import date

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, School, User
from apps.students.models import SchoolClass, Student

from .models import Application

MEDIA = tempfile.mkdtemp()
FORM = {
    "first_name": "Tino", "last_name": "Moyo", "gender": "M", "date_of_birth": "2013-04-02", "applying_for": "Form 1",
    "guardian_first_name": "Mary", "guardian_last_name": "Moyo", "guardian_relationship": "mother", "guardian_phone": "+263 77 555 0100",
}


@override_settings(MEDIA_ROOT=MEDIA)
class AdmissionsApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()  # the public form is rate limited; start each test with a clean count
        self.client = APIClient()
        School.objects.create(name="Riverside High")
        self.admin = User.objects.create_user("admin", password="x", role="admin")
        self.teacher = User.objects.create_user("teacher", password="x", role="teacher")
        self.year = AcademicYear.objects.create(name="2026", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)

    def test_anyone_can_apply_but_cannot_set_staff_fields(self):
        self.assertEqual(self.client.get("/api/admissions/apply/").data, {"school": "Riverside High"})
        document = SimpleUploadedFile("birth.pdf", b"%PDF-1.4", content_type="application/pdf")
        r = self.client.post("/api/admissions/apply/", {**FORM, "status": "offered", "notes": "let me in", "document": document})
        self.assertEqual((r.status_code, r.data), (201, {"received": True}))
        application = Application.objects.get()
        self.assertEqual((application.status, application.notes, bool(application.document)), ("applied", "", True))
        bad = SimpleUploadedFile("run.exe", b"x")
        self.assertEqual(self.client.post("/api/admissions/apply/", {**FORM, "document": bad}).status_code, 400)
        self.assertEqual(self.client.get("/api/admissions/applications/").status_code, 401)  # the list is not public

    def test_staff_move_it_through_stages_and_enrol(self):
        self.client.post("/api/admissions/apply/", FORM)
        application = Application.objects.get()
        url = f"/api/admissions/applications/{application.id}/"
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.patch(url, {"status": "interview", "notes": "Booked for Friday"}).data["status"], "interview")
        self.assertEqual(self.client.patch(url, {"status": "enrolled"}).status_code, 400)  # must use Enrol

        r = self.client.post(url + "enrol/", {"admission_number": "RHS-900", "school_class": self.form1.id}, format="json")
        self.assertEqual((r.status_code, r.data["status"]), (200, "enrolled"))
        student = Student.objects.get(admission_number="RHS-900")
        self.assertEqual((student.full_name, student.guardians.get().full_name), ("Tino Moyo", "Mary Moyo"))
        self.assertEqual(student.enrolments.get().school_class, self.form1)
        self.assertEqual(self.client.post(url + "enrol/", {"admission_number": "RHS-901"}, format="json").status_code, 400)  # only once

    def test_enrol_refuses_a_used_admission_number(self):
        Student.objects.create(admission_number="RHS-900", first_name="A", last_name="B", gender="F")
        self.client.post("/api/admissions/apply/", FORM)
        self.client.force_authenticate(self.admin)
        url = f"/api/admissions/applications/{Application.objects.get().id}/enrol/"
        self.assertEqual(self.client.post(url, {"admission_number": "RHS-900"}, format="json").status_code, 400)
        self.assertEqual(Student.objects.count(), 1)  # nothing half-created
