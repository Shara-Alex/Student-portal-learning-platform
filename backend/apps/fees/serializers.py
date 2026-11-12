from decimal import Decimal

from rest_framework import serializers

from .models import Fee, FeeSettings, Invoice, InvoiceLine, Payment

# Money leaves the API as numbers (450.0), not text ("450.00"), so the frontend can add it up.
money = {"max_digits": 10, "decimal_places": 2, "coerce_to_string": False}


class FeeSettingsSerializer(serializers.ModelSerializer):
    late_fee = serializers.DecimalField(**money, min_value=Decimal(0))

    class Meta:
        model = FeeSettings
        fields = ["late_fee"]


class FeeSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(**money, min_value=Decimal("0.01"))
    school_class_name = serializers.CharField(source="school_class.name", read_only=True, default="")
    term_name = serializers.SerializerMethodField()

    class Meta:
        model = Fee
        fields = ["id", "term", "term_name", "school_class", "school_class_name", "name", "amount"]

    def get_term_name(self, obj):
        return str(obj.term)


class InvoiceLineSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(**money)

    class Meta:
        model = InvoiceLine
        fields = ["id", "description", "amount"]


class PaymentSerializer(serializers.ModelSerializer):
    amount = serializers.DecimalField(**money, min_value=Decimal("0.01"))
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ["id", "invoice", "amount", "date", "method", "reference", "received_by_name"]

    def get_received_by_name(self, obj):
        return str(obj.received_by) if obj.received_by else ""

    def validate(self, data):
        # Reload the invoice with its lines and payments so the balance is right up to date.
        invoice = Invoice.objects.prefetch_related("lines", "payments").get(pk=data["invoice"].pk)
        if data["amount"] > invoice.balance:
            raise serializers.ValidationError({"amount": f"That is more than the {invoice.balance} still owed on this invoice."})
        return data


class InvoiceSerializer(serializers.ModelSerializer):
    """Read-only. Invoices are created by billing a class, not typed in one by one."""

    student_name = serializers.CharField(source="student.full_name", read_only=True)
    admission_number = serializers.CharField(source="student.admission_number", read_only=True)
    term_name = serializers.SerializerMethodField()
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    total = serializers.DecimalField(**money, read_only=True)
    paid = serializers.DecimalField(**money, read_only=True)
    balance = serializers.DecimalField(**money, read_only=True)
    due_now = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    schedule = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id", "number", "student", "student_name", "admission_number", "term", "term_name",
            "issued", "due_date", "instalments", "late_fee_applied",
            "lines", "payments", "total", "paid", "balance", "due_now", "status", "schedule",
        ]

    def get_term_name(self, obj):
        return str(obj.term)

    def get_due_now(self, obj):
        return float(obj.due_now())

    def get_status(self, obj):
        return obj.status()

    def get_schedule(self, obj):
        return [{"due": due, "amount": float(amount)} for due, amount in obj.schedule()]


class BillSerializer(serializers.Serializer):
    """What the admin fills in to bill a whole class for a term."""

    school_class = serializers.IntegerField()
    term = serializers.IntegerField()
    due_date = serializers.DateField()
    instalments = serializers.IntegerField(min_value=1, max_value=6, default=1)
