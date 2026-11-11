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
]
