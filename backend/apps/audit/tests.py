from datetime import date, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.academics.models import Subject, TeachingAssignment
from apps.assessments.models import Assessment
from apps.core.models import AcademicYear, Term, User
from apps.fees.models import Invoice, InvoiceLine, Payment
from apps.students.models import Guardian, SchoolClass, Student

from .models import AuditEntry

STRONG = "Chalk-and-board-2026"


class AuditTrailTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        today = timezone.localdate()
        self.admin = User.objects.create_user("admin", password="x", role="admin", first_name="Ann", last_name="Admin")
        self.banda = User.objects.create_user("banda", password="x", role="teacher", first_name="Tom", last_name="Banda")
        self.year = AcademicYear.objects.create(name="Y", start_date=today - timedelta(days=100), end_date=today + timedelta(days=100), is_current=True)
        self.term = Term.objects.create(year=self.year, name="Term 1", start_date=today - timedelta(days=30), end_date=today + timedelta(days=30), is_current=True)
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)
        self.tino = Student.objects.create(admission_number="S1", first_name="Tino", last_name="Moyo", gender="M")
        self.tino.enrol(self.form1, self.year)
        maths = Subject.objects.create(name="Mathematics", code="MATH")
        assignment = TeachingAssignment.objects.create(year=self.year, school_class=self.form1, subject=maths, teacher=self.banda)
        self.test1 = Assessment.objects.create(assignment=assignment, term=self.term, name="Test 1", date=today, total_marks=50)

    def as_user(self, user):
        self.client.force_authenticate(user)

    def save_marks(self, score, comment=""):
        url = f"/api/assessments/assessments/{self.test1.id}/marks/"
        return self.client.post(url, {"marks": [{"student": self.tino.id, "score": score, "comment": comment}]}, format="json")

    def make_invoice(self):
        invoice = Invoice.objects.create(student=self.tino, term=self.term, due_date=timezone.localdate())
        InvoiceLine.objects.create(invoice=invoice, description="Tuition", amount=300)
        return invoice

    # ---- marks -------------------------------------------------------------
    def test_mark_changes_are_recorded_with_old_and_new(self):
        self.as_user(self.banda)
        self.assertEqual(self.save_marks(40).status_code, 200)
        self.assertEqual(self.save_marks(45).status_code, 200)
        first, second = AuditEntry.objects.filter(action="mark_changed").order_by("id")
        self.assertEqual(first.changes, {"score": [None, "40"]})
        self.assertEqual(second.changes, {"score": ["40", "45"]})
        self.assertEqual((second.actor, second.actor_role, second.student), (self.banda, "teacher", self.tino))
        self.assertIn("score 40 to 45 out of 50", second.summary)
        self.assertEqual(second.target_type, "mark")

    def test_resaving_an_unchanged_sheet_records_nothing(self):
        self.as_user(self.banda)
        self.save_marks(40)
        self.save_marks(40)
        self.assertEqual(AuditEntry.objects.count(), 1)

    def test_a_refused_sheet_records_nothing(self):
        self.as_user(self.banda)
        self.assertEqual(self.save_marks(60).status_code, 400)  # more than the total of 50
        self.assertFalse(AuditEntry.objects.exists())

    def test_deleting_an_assessment_says_how_many_marks_went_with_it(self):
        self.as_user(self.banda)
        self.save_marks(40)
        self.assertEqual(self.client.delete(f"/api/assessments/assessments/{self.test1.id}/").status_code, 204)
        entry = AuditEntry.objects.get(action="assessment_deleted")
        self.assertEqual(entry.changes["marks_lost"], 1)
        # The mark's own history survives the delete.
        self.assertTrue(AuditEntry.objects.filter(action="mark_changed").exists())

    # ---- money -------------------------------------------------------------
    def test_payments_recorded_and_deleted_keep_their_details(self):
        invoice = self.make_invoice()
        self.as_user(self.admin)
        response = self.client.post("/api/fees/payments/", {"invoice": invoice.id, "amount": "120.50", "method": "cash", "reference": "R7"}, format="json")
        self.assertEqual(response.status_code, 201)
        payment = Payment.objects.get()
        self.assertEqual(self.client.delete(f"/api/fees/payments/{payment.id}/").status_code, 204)
        recorded = AuditEntry.objects.get(action="payment_recorded")
        deleted = AuditEntry.objects.get(action="payment_deleted")
        self.assertEqual(deleted.changes["amount"], "120.5")
        self.assertEqual(deleted.changes["reference"], "R7")
        self.assertEqual(deleted.target_id, recorded.target_id)  # the same payment, even though it is gone
        self.assertEqual(deleted.student, self.tino)

    def test_deleting_an_invoice_is_recorded(self):
        invoice = self.make_invoice()
        self.as_user(self.admin)
        self.assertEqual(self.client.delete(f"/api/fees/invoices/{invoice.id}/").status_code, 204)
        entry = AuditEntry.objects.get(action="invoice_deleted")
        self.assertEqual(entry.changes["total"], "300")

    # ---- who may sign in -----------------------------------------------------
    def test_adding_and_changing_users_is_recorded(self):
        self.as_user(self.admin)
        response = self.client.post("/api/core/users/", {
            "username": "rufaro", "first_name": "Rufaro", "last_name": "Dube", "role": "teacher", "password": STRONG,
        }, format="json")
        self.assertEqual(response.status_code, 201)
        user_id = response.data["id"]
        self.client.patch(f"/api/core/users/{user_id}/", {"role": "bursar"}, format="json")
        self.client.patch(f"/api/core/users/{user_id}/", {"is_active": False}, format="json")
        self.client.patch(f"/api/core/users/{user_id}/", {"phone": ""}, format="json")  # no real change: nothing logged

        added = AuditEntry.objects.get(action="user_created")
        self.assertNotIn("password", added.changes)
        changes = list(AuditEntry.objects.filter(action="user_changed").order_by("id"))
        self.assertEqual(len(changes), 2)
        self.assertEqual(changes[0].changes, {"role": ["teacher", "bursar"]})
        self.assertIn("role Teacher to Bursar", changes[0].summary)
        self.assertIn("deactivated", changes[1].summary)

    def test_a_password_set_by_an_admin_is_recorded_but_never_the_password(self):
        self.as_user(self.admin)
        response = self.client.post(f"/api/core/users/{self.banda.id}/set-password/", {"password": STRONG}, format="json")
        self.assertEqual(response.status_code, 204)
        entry = AuditEntry.objects.get(action="password_set")
        self.assertEqual(entry.target_id, self.banda.id)
        self.assertNotIn(STRONG, entry.summary + str(entry.changes))

    def test_family_logins_are_recorded(self):
        mary = Guardian.objects.create(first_name="Mary", last_name="Moyo", email="mary@example.com")
        self.as_user(self.admin)
        response = self.client.post(f"/api/students/guardians/{mary.id}/login/", {"username": "mary", "password": STRONG}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("'mary' for Mary Moyo", AuditEntry.objects.get(action="login_created").summary)

    # ---- reading the trail ----------------------------------------------------
    def test_only_admins_can_read_the_trail(self):
        self.as_user(self.banda)
        self.save_marks(40)
        self.assertEqual(self.client.get("/api/audit/entries/").status_code, 403)
        self.as_user(self.admin)
        response = self.client.get(f"/api/audit/entries/?student={self.tino.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["action_label"], "Mark changed")
        self.assertEqual(response.data["results"][0]["student_name"], "Tino Moyo")

    def test_filters_refuse_nonsense_with_a_400(self):
        self.as_user(self.admin)
        self.assertEqual(self.client.get("/api/audit/entries/?student=abc").status_code, 400)
        self.assertEqual(self.client.get("/api/audit/entries/?date_from=yesterday").status_code, 400)
        today = date.today().isoformat()
        self.assertEqual(self.client.get(f"/api/audit/entries/?date_from={today}&date_to={today}").status_code, 200)

    def test_the_trail_cannot_be_changed(self):
        self.as_user(self.banda)
        self.save_marks(40)
        entry = AuditEntry.objects.get()
        self.as_user(self.admin)
        self.assertEqual(self.client.delete(f"/api/audit/entries/{entry.id}/").status_code, 405)
        self.assertEqual(self.client.patch(f"/api/audit/entries/{entry.id}/", {"summary": "x"}, format="json").status_code, 405)
        entry.summary = "nothing happened"
        with self.assertRaises(ValueError):
            entry.save()
        with self.assertRaises(ValueError):
            entry.delete()
