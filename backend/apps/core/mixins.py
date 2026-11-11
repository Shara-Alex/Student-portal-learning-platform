from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.response import Response


class ProtectedDeleteMixin:
    """
    Add to a ViewSet. If the row is still used elsewhere (a foreign key with
    on_delete=PROTECT points at it), answer with a clear 400 message instead
    of crashing with a 500 error.
    """

    protected_message = "This record is still in use, so it cannot be deleted."

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response({"detail": self.protected_message}, status=status.HTTP_400_BAD_REQUEST)
