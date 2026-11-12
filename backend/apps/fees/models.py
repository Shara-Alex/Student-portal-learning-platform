"""
fees: what each family owes, and what they have paid.

- Fee           a line of the fee structure: "Tuition, Term 1, Form 1A, 450.00".
                Leave the class empty and it applies to every class.
- Invoice       one student's bill for one term. Built from the fees that apply to them.
- InvoiceLine   one charge on an invoice (copied from a Fee, or a late fee).
- Payment       money received against an invoice.
- FeeSettings   the late payment fee.

An invoice can be paid in instalments. Its status (paid, part paid, overdue,
not yet due) is worked out from the payments, never typed in.
"""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.core.models import Term, TimeStamped
from apps.students.models import SchoolClass, Student

MONEY = {"max_digits": 10, "decimal_places": 2}
CENT = Decimal("0.01")


class FeeSettings(TimeStamped):
    """One row only."""

    late_fee = models.DecimalField(**MONEY, default=0, validators=[MinValueValidator(0)], help_text="0 = no late fee.")

    @classmethod
    def current(cls):
        row, _ = cls.objects.get_or_create(pk=1)
        return row


class Fee(TimeStamped):
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="fees")
    school_class = models.ForeignKey(SchoolClass, on_delete=models.CASCADE, null=True, blank=True, related_name="fees")
    name = models.CharField(max_length=100)  # "Tuition", "Sports levy"
    amount = models.DecimalField(**MONEY, validators=[MinValueValidator(CENT)])

    class Meta:
        ordering = ["term", "school_class__level", "name"]

    def __str__(self):
        return f"{self.name} {self.amount} ({self.school_class or 'all classes'}, {self.term})"


class Invoice(TimeStamped):
    student = models.ForeignKey(Student, on_delete=models.PROTECT, related_name="invoices")
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="invoices")
    number = models.CharField(max_length=20, unique=True, blank=True)  # INV-00012, filled in on save
    issued = models.DateField(default=timezone.localdate)
    due_date = models.DateField(help_text="When the first (or only) instalment is due.")
    # 1 = pay in full by the due date. 3 = three equal parts, a month apart.
    instalments = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(6)])
    late_fee_applied = models.BooleanField(default=False)

    class Meta:
        ordering = ["-issued", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["student", "term"], name="one_invoice_per_student_per_term"),
        ]

    def __str__(self):
        return f"{self.number} {self.student}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.number:
            # The number is built from the row's id, which only exists after the first save.
            self.number = f"INV-{self.pk:05d}"
            super().save(update_fields=["number"])

    # ---- the sums. `lines` and `payments` are read from the prefetch cache when the view loaded them.
    @property
    def total(self):
        return sum((line.amount for line in self.lines.all()), Decimal(0))

    @property
    def paid(self):
        return sum((payment.amount for payment in self.payments.all()), Decimal(0))

    @property
    def balance(self):
        return self.total - self.paid

    def schedule(self):
        """[(due date, amount), ...] Equal parts, 30 days apart; the last part absorbs any odd cent."""
        total, parts = self.total, self.instalments
        each = (total / parts).quantize(CENT)
        amounts = [each] * (parts - 1) + [total - each * (parts - 1)]
        return [(self.due_date + timedelta(days=30 * i), amount) for i, amount in enumerate(amounts)]

    def due_now(self, today=None):
        """How much should have been paid by today but has not been."""
        today = today or timezone.localdate()
        expected = sum((amount for due, amount in self.schedule() if due <= today), Decimal(0))
        return max(expected - self.paid, Decimal(0))

    def status(self, today=None):
        if self.total > 0 and self.balance <= 0:
            return "paid"
        if self.due_now(today) > 0:
            return "overdue"
        return "partial" if self.paid > 0 else "pending"


class InvoiceLine(TimeStamped):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    description = models.CharField(max_length=100)
    amount = models.DecimalField(**MONEY)

    def __str__(self):
        return f"{self.description}: {self.amount}"


class Payment(TimeStamped):
    class Method(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank transfer"
        MOBILE = "mobile", "Mobile money"
        CARD = "card", "Card"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(**MONEY, validators=[MinValueValidator(CENT)])
    date = models.DateField(default=timezone.localdate)
    method = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    reference = models.CharField(max_length=100, blank=True)  # receipt or transaction number
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+")

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.date} {self.amount} ({self.invoice.number})"
