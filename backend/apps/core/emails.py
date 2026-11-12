"""
Sending email. Every email the system sends goes through send_email(), so there
is one place to see how it works and one place to change it.

Where mail actually goes is decided in settings.py (EMAIL_BACKEND): printed in
the terminal while developing, sent through an SMTP server in production.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import School

logger = logging.getLogger("school")


def school_name():
    school = School.current()
    return school.name if school else "Your school"


def send_email(to, subject, body):
    """
    Send one plain-text email. Returns True if it was handed over, False if not.

    It never raises: a mail server being down must not break the thing the user
    was doing (saving a payment, asking for a password reset). Failures go to the log.
    """
    if not to:
        return False
    try:
        send_mail(f"{school_name()}: {subject}", body, settings.DEFAULT_FROM_EMAIL, [to])
        return True
    except Exception:  # noqa: BLE001  any mail failure is logged, never shown to the user
        logger.exception("Could not send email '%s' to %s", subject, to)
        return False
