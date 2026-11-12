from django.contrib import admin

from .models import Message


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("created_at", "sender", "recipient", "subject", "read_at")
    search_fields = ("subject", "body")
