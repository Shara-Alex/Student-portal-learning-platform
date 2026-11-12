"""
python manage.py send_notifications

Sends every notification that is waiting, and retries ones that failed (up to
three attempts each). Meant to be run by a scheduler every few minutes on the
live server, so big batches and anything that failed still go out.
"""
from django.core.management.base import BaseCommand

from apps.notifications.services import send_pending


class Command(BaseCommand):
    help = "Send pending notifications and retry failed ones."

    def handle(self, *args, **options):
        result = send_pending(limit=500)
        self.stdout.write(f"Sent {result['sent']}, failed {result['failed']}.")
