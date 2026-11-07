from rest_framework import generics, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AcademicYear, School, Term
from .permissions import ReadOnlyOrAdmin
from .serializers import AcademicYearSerializer, SchoolSerializer, TermSerializer, UserSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """GET /api/auth/me  -> the logged-in user. PATCH to update own profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


class SchoolView(APIView):
    """GET/PUT /api/core/school -> the single school record for this instance."""

    permission_classes = [ReadOnlyOrAdmin]

    def get(self, request):
        school = School.current()
        return Response(SchoolSerializer(school).data if school else None)

    def put(self, request):
        school = School.current() or School()
        serializer = SchoolSerializer(school, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AcademicYearViewSet(viewsets.ModelViewSet):
    queryset = AcademicYear.objects.prefetch_related("terms")
    serializer_class = AcademicYearSerializer
    permission_classes = [ReadOnlyOrAdmin]


class TermViewSet(viewsets.ModelViewSet):
    queryset = Term.objects.select_related("year")
    serializer_class = TermSerializer
    permission_classes = [ReadOnlyOrAdmin]
