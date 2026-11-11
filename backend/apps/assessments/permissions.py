from rest_framework.permissions import SAFE_METHODS, BasePermission


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


def can_view_student(user, student):
    """Who may see one student's results: staff, that student's own guardians, and the student."""
    if user.role in ("admin", "teacher"):
        return True
    if user.role == "parent":
        return student.guardians.filter(user=user).exists()
    return student.user_id == user.id
