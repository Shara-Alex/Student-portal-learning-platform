"""Reusable role checks. Use on any view: permission_classes = [IsAdmin]."""
from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.roles)


class IsAdmin(HasRole):
    roles = ("admin",)


class IsTeacher(HasRole):
    roles = ("teacher",)


class IsStaff(HasRole):
    roles = ("admin", "teacher")


class IsParentOrStudent(HasRole):
    roles = ("parent", "student")


class ReadOnlyOrAdmin(BasePermission):
    """Anyone logged in can read; only admins can write."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.method in ("GET", "HEAD", "OPTIONS") or request.user.role == "admin"


class StaffReadAdminWrite(BasePermission):
    """Admins and teachers can read; only admins can write. Parents and students get nothing."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user.role in ("admin", "teacher")
        return request.user.role == "admin"
