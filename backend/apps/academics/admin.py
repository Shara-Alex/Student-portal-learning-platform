from django.contrib import admin

from .models import Period, Subject, TeachingAssignment, TimetableEntry


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "group")
    list_filter = ("group",)
    search_fields = ("name", "code")


@admin.register(TeachingAssignment)
class TeachingAssignmentAdmin(admin.ModelAdmin):
    list_display = ("subject", "school_class", "teacher", "year")
    list_filter = ("year", "school_class", "subject")


@admin.register(Period)
class PeriodAdmin(admin.ModelAdmin):
    list_display = ("name", "start_time", "end_time", "is_break")


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ("assignment", "day", "period", "room")
    list_filter = ("day", "period")
