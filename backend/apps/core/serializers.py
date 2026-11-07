"""Serializers turn model rows into JSON for the frontend and validate JSON coming back."""
from rest_framework import serializers

from .models import AcademicYear, School, Term, User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "full_name", "role", "phone"]
        read_only_fields = ["id", "username", "role"]


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = ["id", "name", "motto", "address", "phone", "email", "logo", "currency"]


class TermSerializer(serializers.ModelSerializer):
    year_name = serializers.CharField(source="year.name", read_only=True)

    class Meta:
        model = Term
        fields = ["id", "year", "year_name", "name", "start_date", "end_date", "is_current"]


class AcademicYearSerializer(serializers.ModelSerializer):
    terms = TermSerializer(many=True, read_only=True)

    class Meta:
        model = AcademicYear
        fields = ["id", "name", "start_date", "end_date", "is_current", "terms"]
