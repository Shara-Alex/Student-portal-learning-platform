"""
Who may do what. Access is decided by a user's ROLE, and each role's reach is
written down here in one place. Use on any view: permission_classes = [IsFinance].

The six roles (User.Role):
  admin         everything
  teacher       marks, registers, timetables, students (read)
  bursar        fees only (plus reading student and guardian details)
  front_office  student records and admissions
  parent        their own children, read-only
  student       themselves, read-only
"""
from rest_framework.permissions import SAFE_METHODS, BasePermission

# Groups of roles. Views name a group, never a bare role, so adding a role later means editing these lines only.
ADMIN = ("admin",)
TEACHING = ("admin", "teacher")        # may see marks and registers
OFFICE = ("admin", "front_office")     # may change student records and admissions
FINANCE = ("admin", "bursar")          # may see and change fees
ALL_STAFF = ("admin", "teacher", "bursar", "front_office")
FAMILY = ("parent", "student")


def role_of(request):
    """The logged-in user's role, or None if nobody is logged in."""
    user = request.user
    return user.role if user and user.is_authenticated else None


class HasRole(BasePermission):
    """Every method needs one of `roles`."""

    roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return role_of(request) in self.roles


class ReadWrite(BasePermission):
    """Reading needs one of `read` (None = anyone logged in). Changing needs one of `write`."""

    read: tuple[str, ...] | None = None
    write: tuple[str, ...] = ADMIN

    def has_permission(self, request, view):
        role = role_of(request)
        if role is None:
            return False
        if request.method in SAFE_METHODS:  # GET, HEAD, OPTIONS
            return self.read is None or role in self.read
        return role in self.write


# ---- every method needs the role ------------------------------------------
class IsAdmin(HasRole):
    roles = ADMIN


class IsStaff(HasRole):
    """Admins and teachers: the people who work with marks and registers."""

    roles = TEACHING


class IsOffice(HasRole):
    roles = OFFICE


class IsFinance(HasRole):
    roles = FINANCE


class IsAnyStaff(HasRole):
    roles = ALL_STAFF


# ---- reading is wider than changing ---------------------------------------
class ReadOnlyOrAdmin(ReadWrite):
    """Anyone logged in can read; only admins can change."""


class ReadOnlyOrOffice(ReadWrite):
    """Anyone logged in can read; admins and the front office can change."""

    write = OFFICE


class StaffReadAdminWrite(ReadWrite):
    """Admins and teachers can read; only admins can change. Everyone else gets nothing."""

    read = TEACHING


class StaffReadOfficeWrite(ReadWrite):
    """Any staff member can read; admins and the front office can change. Families get nothing."""

    read = ALL_STAFF
    write = OFFICE
