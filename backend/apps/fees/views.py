from decimal import Decimal

from django.db import transaction
from django.db.models import F, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Term
from apps.core.permissions import FAMILY, FINANCE, IsFinance
from apps.students.models import SchoolClass, Student
from apps.students.permissions import can_view_student
from apps.students.services import class_students

from .models import Fee, FeeSettings, Invoice, InvoiceLine, Payment
from .serializers import BillSerializer, FeeSerializer, FeeSettingsSerializer, InvoiceSerializer, PaymentSerializer

# Money is the bursar's business: every screen here is for admins and the bursar only.
# The one exception is a family looking at its own statement (StatementView).


def invoices():
    """Invoices with everything needed for their sums loaded up front (no query per invoice)."""
    return Invoice.objects.select_related("student", "term__year").prefetch_related("lines", "payments__received_by")


class FeeViewSet(viewsets.ModelViewSet):
    """/api/fees/fees/?term=  The fee structure."""

    serializer_class = FeeSerializer
    permission_classes = [IsFinance]
    pagination_class = None

    def get_queryset(self):
        qs = Fee.objects.select_related("term__year", "school_class")
        if self.action == "list" and self.request.query_params.get("term"):
            qs = qs.filter(term_id=self.request.query_params["term"])
        return qs


class SettingsView(APIView):
    """GET/PUT /api/fees/settings/"""

    permission_classes = [IsFinance]

    def get(self, request):
        return Response(FeeSettingsSerializer(FeeSettings.current()).data)

    def put(self, request):
        serializer = FeeSettingsSerializer(FeeSettings.current(), data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class InvoiceViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """
    /api/fees/invoices/?term=&school_class=&status=
    /api/fees/invoices/bill/             POST: bill every student in a class for a term
    /api/fees/invoices/apply-late-fees/  POST: add the late fee to every overdue invoice (once each)
    /api/fees/invoices/summary/?term=    billed / collected / outstanding
    """

    serializer_class = InvoiceSerializer
    permission_classes = [IsFinance]
    pagination_class = None

    def get_queryset(self):
        qs = invoices()
        if self.action in ("list", "summary"):
            params = self.request.query_params
            if params.get("term"):
                qs = qs.filter(term_id=params["term"])
            if params.get("school_class"):
                # The class the student was in during that invoice's year.
                qs = qs.filter(
                    student__enrolments__school_class_id=params["school_class"],
                    student__enrolments__year_id=F("term__year_id"),
                )
        return qs

    def list(self, request, *args, **kwargs):
        rows = list(self.get_queryset())
        wanted = request.query_params.get("status")
        if wanted:
            # Status is worked out in Python (it depends on today's date), so it is filtered here.
            rows = [invoice for invoice in rows if invoice.status() == wanted]
        return Response(self.get_serializer(rows, many=True).data)

    def perform_destroy(self, instance):
        if instance.payments.exists():
            raise serializers.ValidationError("This invoice has payments recorded against it, so it cannot be deleted.")
        instance.delete()

    @action(detail=False)
    def summary(self, request):
        rows = list(self.get_queryset())
        billed = sum((i.total for i in rows), Decimal(0))
        collected = sum((i.paid for i in rows), Decimal(0))
        return Response({
            "invoices": len(rows),
            "billed": float(billed),
            "collected": float(collected),
            "outstanding": float(billed - collected),
            "overdue": sum(1 for i in rows if i.status() == "overdue"),
        })

    @action(detail=False, methods=["post"])
    def bill(self, request):
        form = BillSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        data = form.validated_data
        school_class = get_object_or_404(SchoolClass, pk=data["school_class"])
        term = get_object_or_404(Term.objects.select_related("year"), pk=data["term"])
        fees = list(Fee.objects.filter(Q(school_class=school_class) | Q(school_class__isnull=True), term=term))
        if not fees:
            raise serializers.ValidationError("There are no fees set for this class and term yet. Add them under Fee structure first.")

        already = set(Invoice.objects.filter(term=term).values_list("student_id", flat=True))
        created = skipped = 0
        with transaction.atomic():
            for student in class_students(school_class, term.year):
                if student.id in already:
                    skipped += 1  # billing twice never doubles anyone's bill
                    continue
                invoice = Invoice.objects.create(student=student, term=term, due_date=data["due_date"], instalments=data["instalments"])
                InvoiceLine.objects.bulk_create(
                    InvoiceLine(invoice=invoice, description=fee.name, amount=fee.amount) for fee in fees
                )
                created += 1
        return Response({"created": created, "skipped": skipped})

    @action(detail=False, methods=["post"], url_path="apply-late-fees")
    def apply_late_fees(self, request):
        late_fee = FeeSettings.current().late_fee
        if late_fee <= 0:
            raise serializers.ValidationError("No late fee has been set. Set one under Fee structure first.")
        applied = 0
        with transaction.atomic():
            for invoice in invoices().filter(late_fee_applied=False):
                if invoice.status() == "overdue":
                    InvoiceLine.objects.create(invoice=invoice, description="Late payment fee", amount=late_fee)
                    invoice.late_fee_applied = True
                    invoice.save(update_fields=["late_fee_applied", "updated_at"])
                    applied += 1
        return Response({"applied": applied})


class PaymentViewSet(mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """/api/fees/payments/  Record money received. Delete only to correct a mistake."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsFinance]

    def perform_create(self, serializer):
        serializer.save(received_by=self.request.user)


class StatementView(APIView):
    """GET /api/fees/statement/?student=  One student's invoices. Finance staff, their guardians, or the student."""

    def get(self, request):
        student = get_object_or_404(Student, pk=request.query_params.get("student") or 0)
        role = request.user.role
        # Finance staff see every statement; a family sees its own. Teachers and the front office see none.
        allowed = role in FINANCE or (role in FAMILY and can_view_student(request.user, student))
        if not allowed:
            raise PermissionDenied("You can only see your own child's fees.")
        rows = list(invoices().filter(student=student))
        return Response({
            "invoices": InvoiceSerializer(rows, many=True).data,
            "balance": float(sum((i.balance for i in rows), Decimal(0))),
            "due_now": float(sum((i.due_now() for i in rows), Decimal(0))),
        })
