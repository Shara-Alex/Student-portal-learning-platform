from django.contrib import admin

from .models import Announcement, Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "start_date", "end_date", "kind", "audience")
    list_filter = ("kind", "audience")


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "audience", "pinned", "publish_until", "author")
