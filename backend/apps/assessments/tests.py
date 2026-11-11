import shutil
import tempfile
from datetime import date

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.academics.models import Subject, TeachingAssignment
from apps.core.models import AcademicYear, Term, User
from apps.students.models import Guardian, SchoolClass, Student

from .models import Assessment, Mark

MEDIA = tempfile.mkdtemp()


@override_settings(MEDIA_ROOT=MEDIA)
class AssessmentsApiTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user("admin", password="x", role="admin")
        self.banda = User.objects.create_user("banda", password="x", role="teacher")
        self.ncube = User.objects.create_user("ncube", password="x", role="teacher")
        self.parent = User.objects.create_user("parent", password="x", role="parent")
        self.stranger = User.objects.create_user("stranger", password="x", role="parent")
        self.year = AcademicYear.objects.create(name="2026", start_date=date(2026, 1, 1), end_date=date(2026, 12, 31), is_current=True)
        self.term = Term.objects.create(year=self.year, name="Term 1", start_date=date(2026, 1, 13), end_date=date(2026, 4, 9), is_current=True)
        self.form1 = SchoolClass.objects.create(name="Form 1A", level=1)
        self.maths = Subject.objects.create(name="Mathematics", code="MATH", group="maths")
        self.english = Subject.objects.create(name="English", code="ENG")
        self.maths_1a = TeachingAssignment.objects.create(year=self.year, school_class=self.form1, subject=self.maths, teacher=self.banda)
        self.english_1a = TeachingAssignment.objects.create(year=self.year, school_class=self.form1, subject=self.english, teacher=self.ncube)
        self.tino = Student.objects.create(admission_number="S1", first_name="Tino", last_name="Moyo", gender="M")
        self.rudo = Student.objects.create(admission_number="S2", first_name="Rudo", last_name="Dube", gender="F")
        for student in (self.tino, self.rudo):
            student.enrol(self.form1, self.year)
        self.tino.guardians.add(Guardian.objects.create(first_name="Mary", last_name="Moyo", user=self.parent))
        self.client.force_authenticate(self.banda)

    def new_assessment(self, assignment=None, **extra):
        data = {"assignment": (assignment or self.maths_1a).id, "term": self.term.id, "name": "Test 1",
                "category": "coursework", "date": "2026-02-01", "total_marks": 50}
        data.update(extra)
        return self.client.post("/api/assessments/assessments/", data)  # multipart, as the frontend sends it

    def save_marks(self, assessment_id, marks):
        body = {"marks": [{"student": s.id, "score": score} for s, score in marks]}
        return self.client.post(f"/api/assessments/assessments/{assessment_id}/marks/", body, format="json")

    def test_teacher_sets_assessment_for_own_class_only(self):
        self.assertEqual(self.new_assessment().status_code, 201)
        self.assertEqual(self.new_assessment(assignment=self.english_1a).status_code, 400)

    def test_mark_sheet_lists_the_class_and_saves_scores(self):
        a = self.new_assessment().data["id"]
        sheet = self.client.get(f"/api/assessments/assessments/{a}/marks/").data
        self.assertEqual([r["full_name"] for r in sheet["rows"]], ["Rudo Dube", "Tino Moyo"])
        r = self.save_marks(a, [(self.tino, 40), (self.rudo, None)])
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual({row["full_name"]: row["score"] for row in r.data["rows"]}, {"Tino Moyo": 40.0, "Rudo Dube": None})
        self.save_marks(a, [(self.tino, 45)])  # saving again updates, it does not duplicate
        self.assertEqual(Mark.objects.filter(student=self.tino).count(), 1)

    def test_score_cannot_exceed_total_and_nothing_is_half_saved(self):
        a = self.new_assessment().data["id"]
        r = self.save_marks(a, [(self.tino, 40), (self.rudo, 51)])
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Mark.objects.count(), 0)

    def test_another_teacher_cannot_change_marks(self):
        a = self.new_assessment().data["id"]
        self.client.force_authenticate(self.ncube)
        self.assertEqual(self.client.get(f"/api/assessments/assessments/{a}/marks/").status_code, 200)
        self.assertEqual(self.save_marks(a, [(self.tino, 10)]).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/assessments/assessments/{a}/").status_code, 403)

    def test_gradebook_weights_coursework_and_exam(self):
        test = self.new_assessment().data["id"]                                             # 40/50 = 80%
        exam = self.new_assessment(name="Exam", category="exam", total_marks=100).data["id"]  # 60/100 = 60%
        self.save_marks(test, [(self.tino, 40)])
        self.save_marks(exam, [(self.tino, 60)])
        r = self.client.get(f"/api/assessments/gradebook/?assignment={self.maths_1a.id}&term={self.term.id}")
        tino = next(row for row in r.data["rows"] if row["full_name"] == "Tino Moyo")
        self.assertEqual((tino["coursework"], tino["exam"]), (80.0, 60.0))
        self.assertEqual(tino["final"], 66.0)  # 80 x 30% + 60 x 70%
        self.assertEqual(tino["grade"], "C")
        self.assertEqual(tino["marks"][str(test)], 40.0)
        rudo = next(row for row in r.data["rows"] if row["full_name"] == "Rudo Dube")
        self.assertIsNone(rudo["final"])  # nothing marked yet: no result, not zero

    def test_only_one_category_marked_uses_it_alone(self):
        test = self.new_assessment().data["id"]
        self.save_marks(test, [(self.tino, 25)])
        r = self.client.get(f"/api/assessments/gradebook/?assignment={self.maths_1a.id}&term={self.term.id}")
        tino = next(row for row in r.data["rows"] if row["full_name"] == "Tino Moyo")
        self.assertEqual(tino["final"], 50.0)

    def test_changing_the_weight_changes_results(self):
        test = self.new_assessment().data["id"]
        exam = self.new_assessment(name="Exam", category="exam", total_marks=100).data["id"]
        self.save_marks(test, [(self.tino, 40)])
        self.save_marks(exam, [(self.tino, 60)])
        self.assertEqual(self.client.put("/api/assessments/settings/", {"coursework_weight": 50}).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.put("/api/assessments/settings/", {"coursework_weight": 50}).data["exam_weight"], 50)
        r = self.client.get(f"/api/assessments/report-card/?student={self.tino.id}&term={self.term.id}")
        self.assertEqual(r.data["subjects"][0]["final"], 70.0)

    def test_report_card_and_who_may_see_it(self):
        maths = self.new_assessment().data["id"]
        self.save_marks(maths, [(self.tino, 45)])  # 90%
        self.client.force_authenticate(self.ncube)
        english = self.new_assessment(assignment=self.english_1a).data["id"]
        self.save_marks(english, [(self.tino, 35)])  # 70%
        url = f"/api/assessments/report-card/?student={self.tino.id}&term={self.term.id}"

        self.client.force_authenticate(self.parent)
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        self.assertEqual([(s["subject"], s["final"], s["grade"]) for s in r.data["subjects"]],
                         [("English", 70.0, "B"), ("Mathematics", 90.0, "A")])
        self.assertEqual((r.data["average"], r.data["grade"], r.data["school_class"]), (80.0, "A", "Form 1A"))
        self.assertEqual([(s["group"], s["passed"]) for s in r.data["subjects"]], [("practical", True), ("maths", True)])

        self.client.force_authenticate(self.stranger)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.assertEqual(self.client.get(f"/api/assessments/transcript/?student={self.tino.id}").status_code, 403)
        # parents cannot reach the staff screens at all
        self.assertEqual(self.client.get("/api/assessments/assessments/").status_code, 403)
        self.assertEqual(self.client.get(f"/api/assessments/class-results/?school_class={self.form1.id}&term={self.term.id}").status_code, 403)

    def test_transcript_and_class_results(self):
        term2 = Term.objects.create(year=self.year, name="Term 2", start_date=date(2026, 5, 5), end_date=date(2026, 8, 6))
        a1 = self.new_assessment().data["id"]
        a2 = self.new_assessment(term=term2.id, date="2026-06-01").data["id"]
        self.save_marks(a1, [(self.tino, 40), (self.rudo, 20)])
        self.save_marks(a2, [(self.tino, 30)])
        t = self.client.get(f"/api/assessments/transcript/?student={self.tino.id}").data
        self.assertEqual([(x["term"]["name"], x["average"]) for x in t["terms"]], [("Term 1", 80.0), ("Term 2", 60.0)])
        rows = self.client.get(f"/api/assessments/class-results/?school_class={self.form1.id}&term={self.term.id}").data
        self.assertEqual([(r["full_name"], r["average"], r["grade"]) for r in rows], [("Rudo Dube", 40.0, "E"), ("Tino Moyo", 80.0, "A")])

    def test_marking_scheme_upload_and_staff_only_download(self):
        scheme = SimpleUploadedFile("scheme.pdf", b"%PDF-1.4 answers", content_type="application/pdf")
        r = self.new_assessment(marking_scheme=scheme)
        self.assertEqual(r.status_code, 201, r.data)
        self.assertTrue(r.data["has_marking_scheme"])
        self.assertNotIn("scheme.pdf", str(r.data))  # no public link in the response
        url = f"/api/assessments/assessments/{r.data['id']}/file/marking_scheme/"
        self.assertEqual(b"".join(self.client.get(url).streaming_content), b"%PDF-1.4 answers")
        self.assertEqual(self.client.get(f"/api/assessments/assessments/{r.data['id']}/file/paper/").status_code, 404)
        self.client.force_authenticate(self.parent)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.banda)
        bad = SimpleUploadedFile("virus.exe", b"x")
        self.assertEqual(self.new_assessment(name="T2", paper=bad).status_code, 400)

    def test_grade_bands_and_rules(self):
        self.client.force_authenticate(self.admin)
        bands = self.client.get("/api/assessments/bands/").data
        self.assertEqual([b["symbol"] for b in bands], ["A", "B", "C", "D", "E", "U"])
        self.assertEqual(self.client.post("/api/assessments/bands/", {"symbol": "A", "min_percent": 90}).status_code, 400)
        self.assertEqual(self.client.post("/api/assessments/bands/", {"symbol": "A*", "min_percent": 90, "remark": "Outstanding"}).status_code, 201)
        # total cannot drop below a score already given; term must match the class's year
        a = self.new_assessment().data["id"]
        self.save_marks(a, [(self.tino, 45)])
        self.assertEqual(self.client.patch(f"/api/assessments/assessments/{a}/", {"total_marks": 40}).status_code, 400)
        other_year = AcademicYear.objects.create(name="2027", start_date=date(2027, 1, 1), end_date=date(2027, 12, 31))
        other_term = Term.objects.create(year=other_year, name="Term 1", start_date=date(2027, 1, 12), end_date=date(2027, 4, 8))
        self.assertEqual(self.new_assessment(term=other_term.id).status_code, 400)
        # "who teaches what" cannot be removed once assessments exist
        self.assertEqual(self.client.delete(f"/api/academics/assignments/{self.maths_1a.id}/").status_code, 400)

    def test_comment_position_and_pass_mark_on_the_report(self):
        a = self.new_assessment().data["id"]
        self.save_marks(a, [(self.tino, 40), (self.rudo, 20)])  # 80% and 40%
        body = {"student": self.rudo.id, "assignment": self.maths_1a.id, "term": self.term.id, "text": "Come for extra lessons."}
        self.assertEqual(self.client.post("/api/assessments/comments/", body).status_code, 200)
        body["text"] = "Much better. Keep going."
        self.client.post("/api/assessments/comments/", body)  # saving again replaces the comment
        gradebook = self.client.get(f"/api/assessments/gradebook/?assignment={self.maths_1a.id}&term={self.term.id}").data
        self.assertEqual({r["full_name"]: r["comment"] for r in gradebook["rows"]}, {"Rudo Dube": "Much better. Keep going.", "Tino Moyo": ""})
        self.assertEqual(gradebook["pass_mark"], 50)

        maths = self.client.get(f"/api/assessments/report-card/?student={self.rudo.id}&term={self.term.id}").data["subjects"][0]
        self.assertEqual((maths["position"], maths["out_of"], maths["passed"]), (2, 2, False))
        self.assertEqual(maths["comment"], "Much better. Keep going.")
        top = self.client.get(f"/api/assessments/report-card/?student={self.tino.id}&term={self.term.id}").data["subjects"][0]
        self.assertEqual((top["position"], top["out_of"], top["passed"]), (1, 2, True))

        self.client.force_authenticate(self.ncube)  # not the maths teacher
        self.assertEqual(self.client.post("/api/assessments/comments/", body).status_code, 400)
