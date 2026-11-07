from django.test import TestCase
from rest_framework.test import APIClient

from .models import School, User


class CoreApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        School.objects.create(name="Test High")
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin")
        self.parent = User.objects.create_user("parent", password="pass1234", role="parent")

    def login(self, username):
        r = self.client.post("/api/auth/login/", {"username": username, "password": "pass1234"})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])

    def test_me_returns_role(self):
        self.login("admin")
        r = self.client.get("/api/auth/me/")
        self.assertEqual(r.data["role"], "admin")

    def test_parent_can_read_but_not_edit_school(self):
        self.login("parent")
        self.assertEqual(self.client.get("/api/core/school/").status_code, 200)
        self.assertEqual(self.client.put("/api/core/school/", {"name": "X"}).status_code, 403)

    def test_anonymous_blocked(self):
        self.assertEqual(self.client.get("/api/core/school/").status_code, 401)
