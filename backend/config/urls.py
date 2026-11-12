"""
Root URL map. Every module mounts under /api/<module>/ — same name as its
folder in backend/apps/ and in frontend/src/modules/.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.core.auth_urls")),
    path("api/core/", include("apps.core.urls")),
    path("api/students/", include("apps.students.urls")),
    path("api/academics/", include("apps.academics.urls")),
    path("api/assessments/", include("apps.assessments.urls")),
    path("api/attendance/", include("apps.attendance.urls")),
    path("api/fees/", include("apps.fees.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/communication/", include("apps.communication.urls")),
    path("api/admissions/", include("apps.admissions.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
]

# What to answer for an unknown address, or a crash outside the API views (used when DEBUG is off).
handler404 = "apps.core.exceptions.not_found"
handler500 = "apps.core.exceptions.server_error"
