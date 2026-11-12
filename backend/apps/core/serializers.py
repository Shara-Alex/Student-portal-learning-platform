"""Serializers turn model rows into JSON for the frontend and validate JSON coming back."""
from zoneinfo import available_timezones

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import AcademicYear, School, Term, User
from .permissions import ALL_STAFF

MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2 MB


def check_password_rules(password, user=None):
    """Run the project's password rules (settings.AUTH_PASSWORD_VALIDATORS) and report failures the DRF way."""
    try:
        validate_password(password, user)
    except DjangoValidationError as error:
        raise serializers.ValidationError(error.messages)
    return password


class UserSerializer(serializers.ModelSerializer):
    """A person's public details. Also what you may change about yourself at /api/auth/me/ (never your role)."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "full_name", "role", "phone"]
        read_only_fields = ["id", "username", "role"]


class UserAdminSerializer(serializers.ModelSerializer):
    """What an admin sees and may change on the Users screen in Settings."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    # Only when creating. Afterwards a password is changed through its own endpoint, never by editing the user.
    password = serializers.CharField(write_only=True, required=False, validators=[check_password_rules])
    linked_to = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "first_name", "last_name", "full_name", "email", "phone",
            "role", "is_active", "last_login", "date_joined", "linked_to", "password",
        ]
        read_only_fields = ["last_login", "date_joined"]

    def get_linked_to(self, obj):
        """For a parent or student login: whose record it belongs to."""
        guardian = getattr(obj, "guardian", None)
        if guardian:
            return f"Guardian: {guardian.full_name}"
        student = getattr(obj, "student", None)
        if student:
            return f"Student: {student.full_name}"
        return ""

    def validate_username(self, value):
        others = User.objects.exclude(pk=self.instance.pk) if self.instance else User.objects.all()
        if others.filter(username__iexact=value).exists():
            raise serializers.ValidationError("That username is already taken.")
        return value

    def validate(self, data):
        user = self.instance
        acting = self.context["request"].user

        if user is None:  # creating
            if "password" not in data:
                raise serializers.ValidationError({"password": "Set a password for the new user."})
            if data.get("role") not in ALL_STAFF:
                raise serializers.ValidationError({
                    "role": "Parent and student logins are created from the guardian's or student's own record, so they are linked to it."
                })
            return data

        data.pop("password", None)  # ignored on edit; see the set-password endpoint
        new_role = data.get("role", user.role)
        still_active = data.get("is_active", user.is_active)

        if (new_role in ALL_STAFF) != (user.role in ALL_STAFF):
            raise serializers.ValidationError({"role": "A staff login cannot become a family login, or the other way round."})
        if user == acting and (new_role != user.role or not still_active):
            raise serializers.ValidationError("You cannot change your own role or deactivate yourself. Ask another administrator.")
        # Never let the school lock itself out.
        losing_admin = user.role == "admin" and user.is_active and (new_role != "admin" or not still_active)
        if losing_admin and not User.objects.filter(role="admin", is_active=True).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This is the only active administrator. Make someone else an administrator first.")
        return data

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # stores a one-way hash, never the password itself
        user.save()
        return user


class SetPasswordSerializer(serializers.Serializer):
    """An admin giving someone a new password."""

    password = serializers.CharField(write_only=True)

    def validate_password(self, value):
        return check_password_rules(value, self.context["user"])


class ChangePasswordSerializer(serializers.Serializer):
    """Someone changing their own password: they must prove they know the current one."""

    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("That is not your current password.")
        return value

    def validate_new_password(self, value):
        return check_password_rules(value, self.context["request"].user)


class ForgotPasswordSerializer(serializers.Serializer):
    """Step 1 of 'forgot password': who are you? A username or an email address."""

    identifier = serializers.CharField()


class ResetPasswordSerializer(serializers.Serializer):
    """Step 2: the two codes from the emailed link, plus the new password."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        from .services import user_from_reset_link  # imported here: services imports this module's neighbours

        user = user_from_reset_link(data["uid"], data["token"])
        if user is None:
            raise serializers.ValidationError("This reset link is no longer valid. Ask for a new one.")
        try:
            check_password_rules(data["new_password"], user)
        except serializers.ValidationError as error:
            raise serializers.ValidationError({"new_password": error.detail})
        data["user"] = user
        return data


class SchoolSerializer(serializers.ModelSerializer):
    # The logo goes IN here. It comes OUT through /api/core/school/logo/ (see views.py).
    logo = serializers.ImageField(write_only=True, required=False, allow_null=True)
    has_logo = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = ["id", "name", "motto", "address", "phone", "email", "logo", "has_logo", "currency", "time_zone"]

    def get_has_logo(self, obj):
        return bool(obj.logo)

    def validate_logo(self, value):
        if value is not None and value.size > MAX_LOGO_SIZE:
            raise serializers.ValidationError("The logo is larger than 2 MB.")
        return value

    def validate_currency(self, value):
        value = value.strip().upper()
        if len(value) != 3 or not value.isalpha():
            raise serializers.ValidationError("Use the three-letter code, such as USD, ZWG or ZMW.")
        return value

    def validate_time_zone(self, value):
        if value not in available_timezones():
            raise serializers.ValidationError("Use a zone name such as Africa/Harare or Africa/Lusaka.")
        return value

    def update(self, instance, validated_data):
        if "logo" in validated_data and validated_data["logo"] is None:  # null = remove the logo
            instance.logo.delete(save=False)
            validated_data.pop("logo")
        return super().update(instance, validated_data)


def check_dates(serializer, data):
    """Shared by years and terms: the end must come after the start."""
    start = data.get("start_date", getattr(serializer.instance, "start_date", None))
    end = data.get("end_date", getattr(serializer.instance, "end_date", None))
    if start and end and end <= start:
        raise serializers.ValidationError({"end_date": "The end date must be after the start date."})
    return start, end


class TermSerializer(serializers.ModelSerializer):
    year_name = serializers.CharField(source="year.name", read_only=True)

    class Meta:
        model = Term
        fields = ["id", "year", "year_name", "name", "start_date", "end_date", "is_current"]

    def validate(self, data):
        start, end = check_dates(self, data)
        year = data.get("year", getattr(self.instance, "year", None))
        if year and (start < year.start_date or end > year.end_date):
            raise serializers.ValidationError(f"The term must fall inside its academic year ({year.start_date} to {year.end_date}).")
        # Two terms of one year must not overlap.
        siblings = Term.objects.filter(year=year).exclude(pk=getattr(self.instance, "pk", None))
        clash = siblings.filter(start_date__lte=end, end_date__gte=start).first()
        if clash:
            raise serializers.ValidationError(f"These dates overlap {clash.name} ({clash.start_date} to {clash.end_date}).")
        return data


class AcademicYearSerializer(serializers.ModelSerializer):
    terms = TermSerializer(many=True, read_only=True)

    class Meta:
        model = AcademicYear
        fields = ["id", "name", "start_date", "end_date", "is_current", "terms"]

    def validate(self, data):
        check_dates(self, data)
        return data
