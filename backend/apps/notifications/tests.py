from datetime import date, timedelta
from unittest.mock import patch

from django.core import mail
from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import AcademicYear, School, Term, User
from apps.fees.models import Invoice, InvoiceLine
from apps.students.models import Guardian, SchoolClass, Student

from .models import Notification


class NotificationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        School.objects.create(name="Test High", currency="USD")
        today = date.today()
        self.year = AcademicYear.objects.create(name="Now", start_date=today - timedelta(days=100), end_date=today + timedelta(days=100), is_current=True)
        self.term = Term.objects.create(year=self.year, name="Term 1", start_date=today - timedelta(days=50), end_date=today + timedelta(days=50), is_current=True)
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin", email="head@example.com")
        self.bursar = User.objects.create_user("bursar", password="pass1234", role="bursar")
        self.teacher = User.objects.create_user("teacher", password="pass1234", role="teacher")
        self.form1 = SchoolClass.objects.create(name="Form 1A", class_teacher=self.teacher)
        self.mum = Guardian.objects.create(first_name="Mary", last_name="Moyo", email="mary@example.com")
        self.no_email = Guardian.objects.create(first_name="John", last_name="Dube")
        self.tariro = self.student("S1", "Tariro", self.mum)
        self.farai = self.student("S2", "Farai", self.no_email)

    def student(self, number, name, guardian):
        s = Student.objects.create(admission_number=number, first_name=name, last_name="Moyo", gender="F")
        s.guardians.add(guardian)
        s.enrol(self.form1, self.year)
        return s

    def login(self, username):
        r = self.client.post("/api/auth/login/", {"username": username, "password": "pass1234"})
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])

    def mark(self, status):
        body = {"entries": [{"student": self.tariro.id, "status": status}, {"student": self.farai.id, "status": status}]}
        return self.client.post(f"/api/attendance/register/?school_class={self.form1.id}", body, format="json")

    # ---- absences ---------------------------------------------------------------
    def test_absence_emails_the_guardian_once(self):
        self.login("teacher")
        self.assertEqual(self.mark("A").status_code, 200)
        self.assertEqual(len(mail.outbox), 1)  # Mary only: John has no email address
        self.assertEqual(mail.outbox[0].to, ["mary@example.com"])
        self.assertIn("Tariro Moyo was marked absent", mail.outbox[0].body)
        self.mark("A")  # saving the register again
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(Notification.objects.get().status, "sent")

    def test_present_sends_nothing_and_the_switch_turns_absences_off(self):
        self.login("teacher")
        self.mark("P")
        self.assertEqual(len(mail.outbox), 0)
        self.client.credentials()
        self.login("admin")
        self.assertEqual(self.client.put("/api/notifications/settings/", {"absence": False}).data["absence"], False)
        self.mark("A")
        self.assertEqual(len(mail.outbox), 0)

    # ---- fees ---------------------------------------------------------------------
    def invoice(self, student, due):
        invoice = Invoice.objects.create(student=student, term=self.term, due_date=due)
        InvoiceLine.objects.create(invoice=invoice, description="Tuition", amount=300)
        return invoice

    def test_fee_reminders(self):
        self.invoice(self.tariro, date.today() - timedelta(days=5))  # overdue
        self.invoice(self.farai, date.today() - timedelta(days=5))  # overdue, but nobody to email
        self.login("bursar")
        r = self.client.post("/api/notifications/log/fee-reminders/", {}, format="json")
        self.assertEqual(r.data, {"queued": 1, "no_email": 1})
        self.assertIn("USD 300.00", mail.outbox[0].body)
        # pressing the button again the same day does not nag twice
        self.assertEqual(self.client.post("/api/notifications/log/fee-reminders/", {}, format="json").data["queued"], 0)
        # the bursar may send reminders but not read the log
        self.assertEqual(self.client.get("/api/notifications/log/").status_code, 403)

    def test_reminders_skip_invoices_not_yet_due_unless_asked(self):
        self.invoice(self.tariro, date.today() + timedelta(days=5))
        self.login("bursar")
        self.assertEqual(self.client.post("/api/notifications/log/fee-reminders/", {}, format="json").data["queued"], 0)
        r = self.client.post("/api/notifications/log/fee-reminders/", {"overdue_only": False}, format="json")
        self.assertEqual(r.data["queued"], 1)

    def test_payment_sends_a_receipt(self):
        invoice = self.invoice(self.tariro, date.today())
        self.login("bursar")
        r = self.client.post("/api/fees/payments/", {"invoice": invoice.id, "amount": "100.00"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("We received USD 100.00", mail.outbox[0].body)
        self.assertIn("Balance still to pay: USD 200.00", mail.outbox[0].body)

    # ---- notices ------------------------------------------------------------------
    def test_notice_goes_to_staff_and_guardians(self):
        self.login("admin")
        self.client.post("/api/events/announcements/", {"title": "Sports day", "body": "Friday.", "audience": "everyone"}, format="json")
        self.assertEqual(sorted(m.to[0] for m in mail.outbox), ["head@example.com", "mary@example.com"])
        mail.outbox.clear()
        self.client.post("/api/events/announcements/", {"title": "Staff meeting", "body": "Monday.", "audience": "staff"}, format="json")
        self.assertEqual([m.to[0] for m in mail.outbox], ["head@example.com"])

    # ---- failures and the log ----------------------------------------------------------
    def test_a_failed_email_never_breaks_the_save_and_can_be_retried(self):
        self.login("teacher")
        with patch("apps.core.emails.send_mail", side_effect=OSError("mail server down")), self.assertLogs("school", "ERROR"):
            self.assertEqual(self.mark("A").status_code, 200)  # the register still saved
        note = Notification.objects.get()
        self.assertEqual((note.status, note.attempts), ("failed", 1))

        self.client.credentials()
        self.login("admin")
        self.assertEqual(self.client.post("/api/notifications/log/send-pending/").data, {"sent": 1, "failed": 0})
        row = self.client.get("/api/notifications/log/?status=sent").data["results"][0]
        self.assertEqual((row["to"], row["student_name"], row["kind_label"]), ("mary@example.com", "Tariro Moyo", "Absence"))

    def test_big_batches_wait_for_the_scheduler(self):
        with patch("apps.notifications.services.SEND_NOW_LIMIT", 0):
            self.login("teacher")
            self.mark("A")
        self.assertEqual(len(mail.outbox), 0)
        self.assertEqual(Notification.objects.get().status, "pending")
        from django.core.management import call_command

        call_command("send_notifications", stdout=open("/dev/null", "w"))
        self.assertEqual(len(mail.outbox), 1)

    # ---- the guardian's email follows them onto their login ---------------------------
    def test_guardian_email_is_copied_to_the_login(self):
        self.login("admin")
        r = self.client.post(f"/api/students/guardians/{self.mum.id}/login/", {"username": "mary", "password": "longenough1"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(User.objects.get(username="mary").email, "mary@example.com")
        self.client.patch(f"/api/students/guardians/{self.mum.id}/", {"email": "new@example.com"})
        self.assertEqual(User.objects.get(username="mary").email, "new@example.com")
