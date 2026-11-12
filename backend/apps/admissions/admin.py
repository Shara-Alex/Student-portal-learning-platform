from django.contrib import admin

from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "applying_for", "status", "guardian_phone", "created_at")
    list_filter = ("status",)
    search_fields = ("first_name", "last_name", "guardian_last_name")
