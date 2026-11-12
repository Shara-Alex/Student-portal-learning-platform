from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, Term, User
from apps.students.models import Guardian, SchoolClass, Student

from .models import Fee, Invoice


class FeesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = today = timezone.localdate()
        self.admin = User.objects.create_user("admin", password="x", role="admin")
        self.teacher = User.objects.create_user("teacher", password="x", role="teacher")
        self.parent = User.objects.create_user("parent", password="x", role="parent")
        self.stranger = User.objects.create_user("stranger", password="x", role="parent")
        self.year = AcademicYear.objects.create(name="Y", start_date=today - timedelta(days=100), end_date=today + timedelta(days=100), is_current=True)
        self.term = Term.objects.create(year=self.year, name="T", start_date=today - timedelta(days=30), end_date=today + timedelta(days=30), is_current=True)
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)
        self.form2 = SchoolClass.objects.create(name="Form 2A", level=2)
        self.tino = Student.objects.create(admission_number="S1", first_name="Tino", last_name="Moyo", gender="M")
        self.rudo = Student.objects.create(admission_number="S2", first_name="Rudo", last_name="Dube", gender="F")
        for s in (self.tino, self.rudo):
            s.enrol(self.form1, self.year)
        self.tino.guardians.add(Guardian.objects.create(first_name="Mary", last_name="Moyo", user=self.parent))
        Fee.objects.create(term=self.term, school_class=self.form1, name="Tuition", amount=300)
        Fee.objects.create(term=self.term, school_class=None, name="Sports levy", amount=20)      # every class
        Fee.objects.create(term=self.term, school_class=self.form2, name="Lab fee", amount=50)     # another class
        self.client.force_authenticate(self.admin)

    def bill(self, due_in_days=14, instalments=1):
        body = {"school_class": self.form1.id, "term": self.term.id, "due_date": str(self.today + timedelta(days=due_in_days)), "instalments": instalments}
        return self.client.post("/api/fees/invoices/bill/", body, format="json")

    def invoice(self, student):
        return self.client.get(f"/api/fees/invoices/{Invoice.objects.get(student=student).id}/").data

    def pay(self, student, amount):
        body = {"invoice": Invoice.objects.get(student=student).id, "amount": amount, "method": "cash"}
        return self.client.post("/api/fees/payments/", body, format="json")

    def test_billing_a_class_uses_the_right_fees_and_never_doubles(self):
        self.assertEqual(self.bill().data, {"created": 2, "skipped": 0})
        inv = self.invoice(self.tino)
        self.assertEqual(sorted(line["description"] for line in inv["lines"]), ["Sports levy", "Tuition"])
        self.assertEqual((inv["total"], inv["balance"], inv["status"]), (320.0, 320.0, "pending"))
        self.assertTrue(inv["number"].startswith("INV-"))
        self.assertEqual(self.bill().data, {"created": 0, "skipped": 2})

    def test_payments_move_the_status(self):
        self.bill()
        self.assertEqual(self.pay(self.tino, 100).status_code, 201)
        self.assertEqual((self.invoice(self.tino)["status"], self.invoice(self.tino)["balance"]), ("partial", 220.0))
        self.assertEqual(self.pay(self.tino, 500).status_code, 400)  # more than is owed
        self.pay(self.tino, 220)
        self.assertEqual(self.invoice(self.tino)["status"], "paid")
        summary = self.client.get(f"/api/fees/invoices/summary/?term={self.term.id}").data
        self.assertEqual((summary["billed"], summary["collected"], summary["outstanding"]), (640.0, 320.0, 320.0))

    def test_instalments_and_overdue(self):
        self.bill(due_in_days=-40, instalments=3)  # first part was due 40 days ago, second 10 days ago
        inv = self.invoice(self.tino)
        self.assertEqual([part["amount"] for part in inv["schedule"]], [106.67, 106.67, 106.66])  # adds up to exactly 320
        self.assertEqual((inv["status"], inv["due_now"]), ("overdue", 213.34))
        self.pay(self.tino, Decimal("213.34"))
        self.assertEqual(self.invoice(self.tino)["status"], "partial")  # up to date, the last part is not due yet
        rows = self.client.get(f"/api/fees/invoices/?term={self.term.id}&status=overdue").data
        self.assertEqual([r["student_name"] for r in rows], ["Rudo Dube"])

    def test_late_fee_is_added_once(self):
        self.bill(due_in_days=-5)
        self.assertEqual(self.client.post("/api/fees/invoices/apply-late-fees/").status_code, 400)  # none set yet
        self.client.put("/api/fees/settings/", {"late_fee": 15}, format="json")
        self.assertEqual(self.client.post("/api/fees/invoices/apply-late-fees/").data, {"applied": 2})
        self.assertEqual(self.client.post("/api/fees/invoices/apply-late-fees/").data, {"applied": 0})
        self.assertEqual(self.invoice(self.tino)["total"], 335.0)

    def test_who_may_see_money(self):
        self.bill()
        url = f"/api/fees/statement/?student={self.tino.id}"
        self.client.force_authenticate(self.parent)
        r = self.client.get(url)
        self.assertEqual((r.status_code, r.data["balance"], len(r.data["invoices"])), (200, 320.0, 1))
        self.assertEqual(self.client.get("/api/fees/invoices/").status_code, 403)
        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.teacher)  # teachers do not see fees at all
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.get("/api/fees/fees/").status_code, 403)

    def test_invoice_with_payments_cannot_be_deleted(self):
        self.bill()
        self.pay(self.tino, 50)
        self.assertEqual(self.client.delete(f"/api/fees/invoices/{Invoice.objects.get(student=self.tino).id}/").status_code, 400)
        self.assertEqual(self.client.delete(f"/api/fees/invoices/{Invoice.objects.get(student=self.rudo).id}/").status_code, 204)
