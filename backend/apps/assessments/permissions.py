from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.students.permissions import can_view_student  # noqa: F401  (kept here so older imports still work)


class AssessmentPermission(BasePermission):
    """
    Staff only. Any teacher or admin can look.
    Changing an assessment or its marks: an admin, or the teacher who teaches that class the subject.
    """

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role in ("admin", "teacher"))

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == "admin" or obj.assignment.teacher_id == request.user.id
