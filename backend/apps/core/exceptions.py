"""
One place decides what every error looks like when it leaves the API.

DRF already answers the errors it understands (bad input, not logged in, not
allowed, not found). This handler adds the ones it does not:

  two saves clashing in the database  -> 409 {"detail": "..."}
  deleting a row that is still used   -> 400 {"detail": "..."}
  a bug in our own code               -> 500 {"detail": "...", "reference": "A1B2C3D4"}

For a bug, the full story (who, which address, the traceback) is written to
logs/app.log under the same reference, so a user can quote eight characters
and you can find exactly what broke.

Switched on by REST_FRAMEWORK["EXCEPTION_HANDLER"] in settings.py.
"""
import logging
import uuid

from django.db import IntegrityError
from django.db.models import ProtectedError
from django.http import JsonResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler, set_rollback

logger = logging.getLogger("school")

CLASH = "This clashes with a record that already exists, or someone else saved the same thing a moment ago. Refresh and try again."
IN_USE = "This record is still in use, so it cannot be deleted."
CRASH = "Something went wrong on our side. Please try again; if it keeps happening, give the school office this reference: {reference}"


def new_reference():
    """Eight characters a person can read out over the phone."""
    return uuid.uuid4().hex[:8].upper()


def log_crash(request, exc):
    """Write an unexpected error to the log and return the reference it was filed under."""
    reference = new_reference()
    user = getattr(request, "user", None)
    who = f"{user.username} ({user.role})" if user and user.is_authenticated else "anonymous"
    # exc_info attaches the traceback: the list of code lines that led to the error.
    logger.error("[%s] %s %s by %s", reference, request.method, request.get_full_path(), who, exc_info=exc)
    return reference


def api_exception_handler(exc, context):
    response = exception_handler(exc, context)  # DRF's own answer, if it has one
    if response is not None:
        return response

    set_rollback()  # undo any half-finished database work from this request

    if isinstance(exc, ProtectedError):
        return Response({"detail": IN_USE}, status=status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, IntegrityError):
        # A database rule (unique, required, foreign key) refused the save. Usually two people saving at once.
        logger.warning("Database refused a save on %s: %s", context["request"].path, exc)
        return Response({"detail": CLASH}, status=status.HTTP_409_CONFLICT)

    reference = log_crash(context["request"], exc)
    return Response(
        {"detail": CRASH.format(reference=reference), "reference": reference},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# ---- errors that happen outside a DRF view (wired up in config/urls.py) ----
def not_found(request, exception=None):
    """An address that does not exist. JSON under /api/, so the frontend never has to read an HTML page."""
    if request.path.startswith("/api/"):
        return JsonResponse({"detail": "There is nothing at this address."}, status=404)
    from django.views.defaults import page_not_found

    return page_not_found(request, exception)


def server_error(request):
    """A crash outside the API views (for example in middleware). Django has already logged the traceback."""
    reference = new_reference()
    logger.error("[%s] Crash outside the API on %s %s", reference, request.method, request.path)
    return JsonResponse({"detail": CRASH.format(reference=reference), "reference": reference}, status=500)
