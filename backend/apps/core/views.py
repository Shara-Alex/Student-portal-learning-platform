import os

from django.db.models import Q
from django.http import FileResponse
from rest_framework import generics, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .mixins import ProtectedDeleteMixin
from .models import AcademicYear, School, Term, User
from .permissions import IsAdmin, ReadOnlyOrAdmin, StaffReadAdminWrite
from .serializers import (
    AcademicYearSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
    SchoolSerializer,
    SetPasswordSerializer,
    TermSerializer,
    UserAdminSerializer,
    UserSerializer,
)
from .services import fresh_tokens, send_reset_link


class MeView(generics.RetrieveUpdateAPIView):
    """GET /api/auth/me/ -> the logged-in user. PATCH to change your own name, email or phone."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/ {current_password, new_password}  Change your own password.
    Answers {access, refresh}: new login tokens, which the frontend must store in place of the old ones.
    """

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])
        # Changing the password cancels every login token issued before it, on every device.
        # Hand back a new pair so THIS device stays signed in.
        return Response(fresh_tokens(request.user))


class ForgotPasswordView(APIView):
    """
    POST /api/auth/forgot-password/ {identifier}   identifier = a username or an email address

    Always answers 204, whether or not the account exists. Answering differently would let a
    stranger test which usernames are real. Limited to 5 tries an hour per computer.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "forgot_password"

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        send_reset_link(serializer.validated_data["identifier"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResetPasswordView(APIView):
    """POST /api/auth/reset-password/ {uid, token, new_password}   uid and token come from the emailed link."""

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reset_password"

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolView(APIView):
    """GET / PUT / PATCH /api/core/school/ -> the single school record for this instance."""

    permission_classes = [ReadOnlyOrAdmin]

    def get(self, request):
        school = School.current()
        return Response(SchoolSerializer(school).data if school else None)

    def _save(self, request, partial):
        school = School.current() or School()
        serializer = SchoolSerializer(school, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self._save(request, partial=False)

    def patch(self, request):
        """Change some fields only, e.g. upload just the logo."""
        return self._save(request, partial=True)


class SchoolLogoView(APIView):
    """GET /api/core/school/logo/  The logo image. Open to anyone, so the login page can show it."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        school = School.current()
        if not school or not school.logo:
            raise NotFound("No logo has been uploaded.")
        return FileResponse(school.logo.open("rb"), filename=os.path.basename(school.logo.name))


class AcademicYearViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """/api/core/years/  Setting is_current on one year un-sets it on the others (see models.py)."""

    queryset = AcademicYear.objects.prefetch_related("terms")
    serializer_class = AcademicYearSerializer
    permission_classes = [ReadOnlyOrAdmin]
    protected_message = "This year has classes, marks or fees recorded against it, so it cannot be deleted."


class TermViewSet(ProtectedDeleteMixin, viewsets.ModelViewSet):
    """/api/core/terms/  Setting is_current on one term un-sets the others and makes its year current."""

    queryset = Term.objects.select_related("year")
    serializer_class = TermSerializer
    permission_classes = [ReadOnlyOrAdmin]
    protected_message = "This term has marks or fees recorded against it, so it cannot be deleted."


class UserViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """
    /api/core/users/?role=&search=&is_active=
    /api/core/users/<id>/set-password/   POST {password}: an admin resets someone's password

    Admins manage users here. Teachers may read the list of ACTIVE users (to pick a class teacher).
    There is no delete: a leaver is deactivated, so their name stays on the marks and messages they wrote.
    """

    permission_classes = [StaffReadAdminWrite]

    def is_admin(self):
        return self.request.user.role == "admin"

    def get_serializer_class(self):
        # Teachers get the short public version; admins get roles, active flags and last login too.
        return UserAdminSerializer if self.is_admin() else UserSerializer

    def get_queryset(self):
        qs = User.objects.select_related("guardian", "student").order_by("last_name", "first_name", "username")
        if not self.is_admin():
            qs = qs.filter(is_active=True)
        if self.action != "list":
            return qs
        params = self.request.query_params
        if params.get("role"):
            qs = qs.filter(role=params["role"])
        if params.get("is_active") in ("true", "false"):
            qs = qs.filter(is_active=params["is_active"] == "true")
        search = params.get("search", "").strip()
        if search:
            qs = qs.filter(Q(first_name__icontains=search) | Q(last_name__icontains=search) | Q(username__icontains=search))
        return qs

    @action(detail=True, methods=["post"], url_path="set-password", permission_classes=[IsAdmin])
    def set_password(self, request, pk=None):
        user = self.get_object()
        serializer = SetPasswordSerializer(data=request.data, context={"user": user})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["password"])
        user.save(update_fields=["password"])
        return Response(status=status.HTTP_204_NO_CONTENT)
