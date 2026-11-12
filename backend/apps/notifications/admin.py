from django.contrib import admin

from .models import Notification, NotificationSettings


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["created_at", "kind", "to", "subject", "status", "attempts"]
    list_filter = ["kind", "status"]
    search_fields = ["to", "recipient_name", "subject"]


admin.site.register(NotificationSettings)
