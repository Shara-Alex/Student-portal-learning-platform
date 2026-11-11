from django.contrib import admin

from .models import Enrolment, Guardian, SchoolClass, Student


class EnrolmentInline(admin.TabularInline):
    model = Enrolment
    extra = 0


@admin.register(SchoolClass)
class SchoolClassAdmin(admin.ModelAdmin):
    list_display = ("name", "level", "class_teacher")


@admin.register(Guardian)
class GuardianAdmin(admin.ModelAdmin):
    list_display = ("last_name", "first_name", "relationship", "phone", "email", "user")
    search_fields = ("first_name", "last_name", "phone", "email")


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ("admission_number", "last_name", "first_name", "gender", "status")
    list_filter = ("status", "gender")
    search_fields = ("admission_number", "first_name", "last_name")
    filter_horizontal = ("guardians",)
    inlines = [EnrolmentInline]
