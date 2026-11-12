def can_view_student(user, student):
    """Who may see one student's own records: staff, that student's guardians, and the student."""
    if user.role in ("admin", "teacher"):
        return True
    if user.role == "parent":
        return student.guardians.filter(user=user).exists()
    return student.user_id == user.id
