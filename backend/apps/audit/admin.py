from django.contrib import admin

from .models import AuditEntry


@admin.register(AuditEntry)
class AuditEntryAdmin(admin.ModelAdmin):
    """Look only. Not even a superuser can add, change or delete an entry from here."""

    list_display = ["at", "actor_name", "actor_role", "action", "summary"]
    list_filter = ["action", "actor_role"]
    search_fields = ["summary", "actor_name"]
    date_hierarchy = "at"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
