from django.contrib import admin

from .models import Assessment, AssessmentSettings, GradeBand, GradeScale, Mark, SubjectComment


class GradeBandInline(admin.TabularInline):
    model = GradeBand
    extra = 0


@admin.register(GradeScale)
class GradeScaleAdmin(admin.ModelAdmin):
    list_display = ("name", "is_default")
    inlines = [GradeBandInline]


@admin.register(AssessmentSettings)
class AssessmentSettingsAdmin(admin.ModelAdmin):
    list_display = ("coursework_weight", "exam_weight", "pass_mark")


class MarkInline(admin.TabularInline):
    model = Mark
    extra = 0


@admin.register(Assessment)
class AssessmentAdmin(admin.ModelAdmin):
    list_display = ("name", "assignment", "term", "category", "date", "total_marks")
    list_filter = ("term", "category")
    inlines = [MarkInline]


@admin.register(SubjectComment)
class SubjectCommentAdmin(admin.ModelAdmin):
    list_display = ("student", "assignment", "term", "text")
    list_filter = ("term",)
