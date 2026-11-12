"""Small helpers shared by several modules."""
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import school_name, send_email
from .models import User


def create_login(role, username, password, first_name="", last_name=""):
    """Create a user who can sign in. Raises a clear validation error if the details are no good."""
    username = (username or "").strip()
    if not username:
        raise serializers.ValidationError({"username": "Choose a username."})
    if User.objects.filter(username__iexact=username).exists():
        raise serializers.ValidationError({"username": "That username is already taken."})
    try:
        validate_password(password or "")
    except DjangoValidationError as error:
        raise serializers.ValidationError({"password": error.messages})
    return User.objects.create_user(username, password=password, role=role, first_name=first_name, last_name=last_name)


def fresh_tokens(user):
    """A new pair of login tokens. Needed after a password change, because that cancels the old pair."""
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ---- forgot password --------------------------------------------------------
# The emailed link carries two things: `uid` (which user, lightly encoded) and `token`
# (a signature Django builds from the user's password hash, last login and the time).
# Nothing is stored in the database. The token stops working after PASSWORD_RESET_TIMEOUT,
# and the moment the password changes, because the password hash it was built from is gone.

def send_reset_link(identifier):
    """Email a reset link to whoever owns this username or email. Returns how many emails were sent."""
    identifier = (identifier or "").strip()
    if not identifier:
        return 0
    users = User.objects.filter(is_active=True).filter(Q(username__iexact=identifier) | Q(email__iexact=identifier)).exclude(email="")
    sent = 0
    for user in users:
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        link = f"{settings.FRONTEND_URL}/reset-password?uid={uid}&token={token}"
        body = (
            f"Hello {user.get_full_name() or user.username},\n\n"
            f"Someone asked to reset the password for your {school_name()} account (username: {user.username}).\n"
            f"Open this link to choose a new password. It works for two hours:\n\n{link}\n\n"
            "If this was not you, ignore this email and your password stays as it is."
        )
        sent += send_email(user.email, "Reset your password", body)
    return sent


def user_from_reset_link(uid, token):
    """The user a reset link belongs to, or None if the link is wrong, used up or too old."""
    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        return None
    return user if default_token_generator.check_token(user, token) else None
