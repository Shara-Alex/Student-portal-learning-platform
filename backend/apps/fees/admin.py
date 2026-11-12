from django.contrib import admin

from .models import Fee, FeeSettings, Invoice, InvoiceLine, Payment


@admin.register(Fee)
class FeeAdmin(admin.ModelAdmin):
    list_display = ("name", "amount", "school_class", "term")
    list_filter = ("term", "school_class")


class LineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ("number", "student", "term", "due_date", "instalments")
    list_filter = ("term",)
    search_fields = ("number", "student__first_name", "student__last_name")
    inlines = [LineInline, PaymentInline]


admin.site.register(FeeSettings)
