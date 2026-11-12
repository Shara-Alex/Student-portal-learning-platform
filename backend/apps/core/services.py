"""Small helpers shared by several modules."""
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

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
