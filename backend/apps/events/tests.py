from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import User

from .models import Announcement, Event


class EventsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.today = today = timezone.localdate()
        self.admin = User.objects.create_user("admin", password="x", role="admin")
        self.teacher = User.objects.create_user("teacher", password="x", role="teacher")
        self.parent = User.objects.create_user("parent", password="x", role="parent")
        Event.objects.create(title="Old sports day", start_date=today - timedelta(days=10))
        Event.objects.create(title="Exams", start_date=today - timedelta(days=1), end_date=today + timedelta(days=3), kind="exam")
        Event.objects.create(title="Staff meeting", start_date=today + timedelta(days=2), audience="staff")
        Event.objects.create(title="Prize giving", start_date=today + timedelta(days=5))
        Announcement.objects.create(title="Expired", body="x", publish_until=today - timedelta(days=1))
        Announcement.objects.create(title="Staff only", body="x", audience="staff")
        Announcement.objects.create(title="Fees are due", body="x", pinned=True)
        Announcement.objects.create(title="Uniform reminder", body="x")

    def titles(self, url):
        return [row["title"] for row in self.client.get(url).data]

    def test_upcoming_includes_events_in_progress(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.titles("/api/events/events/?upcoming=1"), ["Exams", "Staff meeting", "Prize giving"])
        self.assertEqual(len(self.titles("/api/events/events/")), 4)

    def test_parents_do_not_see_staff_items_or_expired_notices(self):
        self.client.force_authenticate(self.parent)
        self.assertEqual(self.titles("/api/events/events/?upcoming=1"), ["Exams", "Prize giving"])
        self.assertEqual(self.titles("/api/events/announcements/"), ["Fees are due", "Uniform reminder"])  # pinned first
        self.assertEqual(self.client.post("/api/events/announcements/", {"title": "Hi", "body": "x"}).status_code, 403)

    def test_admin_posts_and_end_date_rule(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/events/announcements/", {"title": "Closed Friday", "body": "Public holiday."})
        self.assertEqual((r.status_code, r.data["author_name"]), (201, "admin"))
        self.assertIn("Expired", self.titles("/api/events/announcements/"))  # admins still see expired ones
        bad = {"title": "Trip", "start_date": str(self.today), "end_date": str(self.today - timedelta(days=1))}
        self.assertEqual(self.client.post("/api/events/events/", bad).status_code, 400)
