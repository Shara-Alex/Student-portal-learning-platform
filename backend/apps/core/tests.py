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


class SettingsTests(TestCase):
    """Settings: users, passwords, the new roles, and 'only one current year/term'."""

    def setUp(self):
        self.client = APIClient()
        School.objects.create(name="Test High")
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin")
        self.teacher = User.objects.create_user("teacher", password="pass1234", role="teacher")
        self.bursar = User.objects.create_user("bursar", password="pass1234", role="bursar")
        self.office = User.objects.create_user("office", password="pass1234", role="front_office")
        self.parent = User.objects.create_user("parent", password="pass1234", role="parent")

    def login(self, username, password="pass1234"):
        r = self.client.post("/api/auth/login/", {"username": username, "password": password})
        self.assertEqual(r.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + r.data["access"])

    # ---- users ------------------------------------------------------------
    def test_admin_creates_a_bursar_who_can_log_in(self):
        self.login("admin")
        r = self.client.post("/api/core/users/", {"username": "money", "password": "longenough1", "role": "bursar", "first_name": "Mo"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertNotIn("password", r.data)  # a password never comes back out
        self.client.credentials()
        self.login("money", "longenough1")

    def test_user_rules(self):
        self.login("admin")
        post = lambda data: self.client.post("/api/core/users/", data)
        self.assertEqual(post({"username": "x", "role": "teacher"}).status_code, 400)  # no password
        self.assertEqual(post({"username": "x", "role": "teacher", "password": "short"}).status_code, 400)  # too short
        self.assertEqual(post({"username": "x", "role": "parent", "password": "longenough1"}).status_code, 400)  # family logins come from records
        self.assertEqual(post({"username": "ADMIN", "role": "teacher", "password": "longenough1"}).status_code, 400)  # taken
        self.assertEqual(self.client.delete(f"/api/core/users/{self.teacher.id}/").status_code, 405)  # deactivate instead

    def test_admin_cannot_lock_the_school_out(self):
        self.login("admin")
        me = f"/api/core/users/{self.admin.id}/"
        self.assertEqual(self.client.patch(me, {"role": "teacher"}).status_code, 400)
        self.assertEqual(self.client.patch(me, {"is_active": False}).status_code, 400)
        # a staff login cannot become a family login
        self.assertEqual(self.client.patch(f"/api/core/users/{self.teacher.id}/", {"role": "parent"}).status_code, 400)

    def test_deactivated_user_cannot_log_in(self):
        self.login("admin")
        r = self.client.patch(f"/api/core/users/{self.teacher.id}/", {"is_active": False})
        self.assertEqual(r.status_code, 200, r.data)
        self.client.credentials()
        r = self.client.post("/api/auth/login/", {"username": "teacher", "password": "pass1234"})
        self.assertEqual(r.status_code, 401)

    def test_who_can_see_users(self):
        self.login("teacher")
        r = self.client.get("/api/core/users/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("is_active", r.data["results"][0])  # teachers get the short version
        self.assertEqual(self.client.post("/api/core/users/", {"username": "x", "role": "teacher", "password": "longenough1"}).status_code, 403)
        for name in ("bursar", "office", "parent"):
            self.client.credentials()
            self.login(name)
            self.assertEqual(self.client.get("/api/core/users/").status_code, 403, name)

    def test_search_and_filter(self):
        self.login("admin")
        self.assertEqual(self.client.get("/api/core/users/?role=bursar").data["count"], 1)
        self.assertEqual(self.client.get("/api/core/users/?search=offi").data["count"], 1)

    # ---- passwords --------------------------------------------------------
    def test_admin_resets_a_password(self):
        self.login("admin")
        url = f"/api/core/users/{self.teacher.id}/set-password/"
        self.assertEqual(self.client.post(url, {"password": "short"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"password": "brandnew123"}).status_code, 204)
        self.client.credentials()
        self.login("teacher", "brandnew123")
        self.assertEqual(self.client.post(url, {"password": "brandnew456"}).status_code, 403)  # teachers cannot

    def test_change_own_password(self):
        self.login("parent")
        url = "/api/auth/change-password/"
        self.assertEqual(self.client.post(url, {"current_password": "wrong", "new_password": "brandnew123"}).status_code, 400)
        self.assertEqual(self.client.post(url, {"current_password": "pass1234", "new_password": "brandnew123"}).status_code, 200)
        self.client.credentials()
        self.login("parent", "brandnew123")

    # ---- the new roles ----------------------------------------------------
    def test_bursar_reaches_fees_only(self):
        self.login("bursar")
        self.assertEqual(self.client.get("/api/fees/invoices/").status_code, 200)
        self.assertEqual(self.client.get("/api/admissions/applications/").status_code, 403)
        self.assertEqual(self.client.get("/api/assessments/gradebook/").status_code, 403)
        self.assertEqual(self.client.post("/api/students/students/", {}).status_code, 403)

    def test_front_office_reaches_students_and_admissions_only(self):
        self.login("office")
        self.assertEqual(self.client.get("/api/admissions/applications/").status_code, 200)
        self.assertEqual(self.client.get("/api/students/guardians/").status_code, 200)
        self.assertEqual(self.client.post("/api/students/guardians/", {}).status_code, 400)  # allowed in; the empty form is what fails
        self.assertEqual(self.client.get("/api/fees/invoices/").status_code, 403)
        self.assertEqual(self.client.get("/api/assessments/gradebook/").status_code, 403)
        self.assertEqual(self.client.post("/api/students/enrolments/promote/", {}).status_code, 403)

    def test_teacher_still_kept_out_of_fees_and_admissions(self):
        self.login("teacher")
        self.assertEqual(self.client.get("/api/fees/invoices/").status_code, 403)
        self.assertEqual(self.client.get("/api/admissions/applications/").status_code, 403)

    # ---- school, years and terms -------------------------------------------
    def test_school_patch_and_currency(self):
        self.login("admin")
        r = self.client.patch("/api/core/school/", {"motto": "Onward"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["name"], "Test High")  # untouched fields stay
        self.assertEqual(self.client.patch("/api/core/school/", {"currency": "dollars"}).status_code, 400)
        self.client.credentials()
        self.assertEqual(self.client.get("/api/core/school/logo/").status_code, 404)  # public, but nothing uploaded

    def test_only_one_current_year_and_term(self):
        self.login("admin")
        year = lambda n, cur: self.client.post("/api/core/years/", {"name": n, "start_date": f"{n}-01-01", "end_date": f"{n}-12-31", "is_current": cur}).data["id"]
        y1, y2 = year("2026", True), year("2027", False)
        term = lambda y, n, a, b, cur=False: self.client.post("/api/core/terms/", {"year": y, "name": n, "start_date": a, "end_date": b, "is_current": cur})
        t1 = term(y1, "Term 1", "2026-01-10", "2026-04-01", True).data["id"]
        t2 = term(y2, "Term 1", "2027-01-10", "2027-04-01").data["id"]

        # making a 2027 term current moves everything across
        self.assertEqual(self.client.patch(f"/api/core/terms/{t2}/", {"is_current": True}).status_code, 200)
        years = {y["id"]: y for y in self.client.get("/api/core/years/").data["results"]}
        self.assertFalse(years[y1]["is_current"])
        self.assertTrue(years[y2]["is_current"])
        self.assertFalse(self.client.get(f"/api/core/terms/{t1}/").data["is_current"])

        # date rules
        self.assertEqual(term(y1, "Bad", "2026-05-01", "2026-04-01").status_code, 400)  # ends before it starts
        self.assertEqual(term(y1, "Bad", "2026-11-01", "2027-02-01").status_code, 400)  # outside its year
        self.assertEqual(term(y1, "Bad", "2026-03-01", "2026-05-01").status_code, 400)  # overlaps Term 1


class AccountSafetyTests(TestCase):
    """Sessions ending on a password change, forgot password, the school's time zone, and error replies."""

    def setUp(self):
        from django.core.cache import cache

        cache.clear()  # the "5 tries an hour" counters live in the cache; start each test from zero
        self.client = APIClient()
        School.objects.create(name="Test High")
        self.admin = User.objects.create_user("admin", password="pass1234", role="admin")
        self.teacher = User.objects.create_user("teacher", password="pass1234", role="teacher", email="teacher@example.com")

    def tokens(self, username, password="pass1234"):
        r = self.client.post("/api/auth/login/", {"username": username, "password": password})
        self.assertEqual(r.status_code, 200)
        return r.data

    def use(self, access):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer " + access)

    # ---- a password change ends older sessions ------------------------------
    def test_admin_reset_logs_the_user_out_everywhere(self):
        old = self.tokens("teacher")
        self.use(self.tokens("admin")["access"])
        self.client.post(f"/api/core/users/{self.teacher.id}/set-password/", {"password": "brandnew123"})

        self.use(old["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)  # the old login is dead
        # the old refresh token can still mint an access token, but that one is dead too
        self.client.credentials()
        r = self.client.post("/api/auth/refresh/", {"refresh": old["refresh"]})
        if r.status_code == 200:
            self.use(r.data["access"])
            self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)

    def test_changing_my_own_password_keeps_this_device_signed_in(self):
        old = self.tokens("teacher")
        self.use(old["access"])
        r = self.client.post("/api/auth/change-password/", {"current_password": "pass1234", "new_password": "brandnew123"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)  # old token
        self.use(r.data["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)  # the new one it handed back

    # ---- forgot password ------------------------------------------------------
    def test_forgot_password_round_trip(self):
        from django.core import mail

        self.assertEqual(self.client.post("/api/auth/forgot-password/", {"identifier": "teacher"}).status_code, 204)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["teacher@example.com"])
        link = [word for word in mail.outbox[0].body.split() if "reset-password?" in word][0]
        uid, token = link.split("uid=")[1].split("&token=")

        reset = lambda data: self.client.post("/api/auth/reset-password/", data)
        self.assertEqual(reset({"uid": uid, "token": "wrong", "new_password": "brandnew123"}).status_code, 400)
        self.assertEqual(reset({"uid": uid, "token": token, "new_password": "short"}).status_code, 400)
        self.assertEqual(reset({"uid": uid, "token": token, "new_password": "brandnew123"}).status_code, 204)
        self.tokens("teacher", "brandnew123")
        # a link works once
        self.assertEqual(reset({"uid": uid, "token": token, "new_password": "another12345"}).status_code, 400)

    def test_forgot_password_never_says_whether_the_account_exists(self):
        from django.core import mail

        for who in ("nobody", "admin"):  # admin exists but has no email address
            self.assertEqual(self.client.post("/api/auth/forgot-password/", {"identifier": who}).status_code, 204)
        self.assertEqual(len(mail.outbox), 0)

    # ---- time zone --------------------------------------------------------------
    def test_school_time_zone(self):
        self.use(self.tokens("admin")["access"])
        self.assertEqual(self.client.get("/api/core/school/").data["time_zone"], "Africa/Harare")
        r = self.client.patch("/api/core/school/", {"time_zone": "Africa/Lusaka"})
        self.assertEqual(r.data["time_zone"], "Africa/Lusaka")
        self.assertEqual(self.client.patch("/api/core/school/", {"time_zone": "Harare"}).status_code, 400)

    # ---- error replies ------------------------------------------------------------
    def test_a_crash_becomes_a_logged_500_with_a_reference(self):
        from unittest.mock import patch

        self.use(self.tokens("admin")["access"])
        self.client.raise_request_exception = False
        with patch("apps.core.views.School.current", side_effect=RuntimeError("boom")), self.assertLogs("school", "ERROR") as logs:
            r = self.client.get("/api/core/school/")
        self.assertEqual(r.status_code, 500)
        self.assertIn(r.data["reference"], r.data["detail"])
        self.assertIn(r.data["reference"], logs.output[0])
        self.assertIn("admin (admin)", logs.output[0])

    def test_a_database_clash_becomes_a_409(self):
        from unittest.mock import patch

        from django.db import IntegrityError

        self.use(self.tokens("admin")["access"])
        with patch("apps.core.views.School.current", side_effect=IntegrityError("duplicate")):
            r = self.client.get("/api/core/school/")
        self.assertEqual(r.status_code, 409)
        self.assertIn("detail", r.data)

    def test_unknown_api_address_answers_json(self):
        r = self.client.get("/api/nothing-here/")
        self.assertEqual(r.status_code, 404)
        self.assertEqual(r["Content-Type"], "application/json")
