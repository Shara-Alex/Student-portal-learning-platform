"""
assessments: tests and exams, the marks students get, and how marks become grades.

- GradeScale / GradeBand   "80% and above is an A (Excellent)". One default scale for the school.
- AssessmentSettings       how much coursework counts against the exam (e.g. 30 / 70).
- Assessment               one test or exam set for a class in a subject in a term,
                           with optional question paper and marking scheme files.
- Mark                     one student's score in one assessment.
- SubjectComment           the teacher's end-of-term comment for one student in one subject.

Results (term mark, grade, report card, transcript) are NOT stored. They are
worked out from the marks every time they are asked for (see services.py), so
a parent always sees the latest figures the moment a teacher saves a mark.
"""
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.academics.models import TeachingAssignment
from apps.core.models import Term, TimeStamped
from apps.students.models import Student

# The scale a new school starts with. Admins can change it on the Grading screen.
STARTER_BANDS = [
    ("A", 80, "Excellent"),
    ("B", 70, "Very good"),
    ("C", 60, "Good"),
    ("D", 50, "Satisfactory"),
    ("E", 40, "Needs improvement"),
    ("U", 0, "Ungraded"),
]


class GradeScale(TimeStamped):
    name = models.CharField(max_length=100, unique=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name

    @classmethod
    def default(cls):
        """The school's grading scale. Created with starter bands the first time it is needed."""
        scale = cls.objects.filter(is_default=True).first()
        if scale is None:
            scale = cls.objects.create(name="Default", is_default=True)
            GradeBand.objects.bulk_create(
                GradeBand(scale=scale, symbol=symbol, min_percent=minimum, remark=remark)
                for symbol, minimum, remark in STARTER_BANDS
            )
        return scale


class GradeBand(TimeStamped):
    scale = models.ForeignKey(GradeScale, on_delete=models.CASCADE, related_name="bands")
    symbol = models.CharField(max_length=5)  # "A", "B+", "1"
    # A mark gets the band with the highest min_percent it reaches.
    min_percent = models.DecimalField(
        max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    remark = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ["-min_percent"]
        constraints = [
            models.UniqueConstraint(fields=["scale", "symbol"], name="one_band_per_symbol"),
            models.UniqueConstraint(fields=["scale", "min_percent"], name="one_band_per_threshold"),
        ]

    def __str__(self):
        return f"{self.symbol} ({self.min_percent}%+)"


class AssessmentSettings(TimeStamped):
    """One row only. Coursework and exam weights always add up to 100."""

    coursework_weight = models.PositiveSmallIntegerField(default=30, validators=[MaxValueValidator(100)])
    # Below this percentage a mark shows in red and a subject counts as failed.
    pass_mark = models.PositiveSmallIntegerField(default=50, validators=[MaxValueValidator(100)])

    @classmethod
    def current(cls):
        settings, _ = cls.objects.get_or_create(pk=1)
        return settings

    @property
    def exam_weight(self):
        return 100 - self.coursework_weight


class Assessment(TimeStamped):
    class Category(models.TextChoices):
        COURSEWORK = "coursework", "Coursework"
        EXAM = "exam", "Exam"

    # The teaching assignment tells us the subject, the class, the teacher and the year in one go.
    # PROTECT: you cannot remove "who teaches what" once marks hang off it.
    assignment = models.ForeignKey(TeachingAssignment, on_delete=models.PROTECT, related_name="assessments")
    term = models.ForeignKey(Term, on_delete=models.PROTECT, related_name="assessments")
    name = models.CharField(max_length=100)  # "Test 1", "End of term exam"
    category = models.CharField(max_length=20, choices=Category.choices, default=Category.COURSEWORK)
    date = models.DateField()
    total_marks = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    paper = models.FileField(upload_to="assessments/papers/", blank=True)
    marking_scheme = models.FileField(upload_to="assessments/schemes/", blank=True)

    class Meta:
        ordering = ["date", "id"]

    def __str__(self):
        return f"{self.name} - {self.assignment}"


class Mark(TimeStamped):
    assessment = models.ForeignKey(Assessment, on_delete=models.CASCADE, related_name="marks")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="marks")
    # Empty score = not marked yet (absent, or the teacher has not got to it). It is left out of every average.
    score = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    comment = models.CharField(max_length=200, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["assessment", "student"], name="one_mark_per_student_per_assessment"),
        ]

    def __str__(self):
        return f"{self.student}: {self.score}/{self.assessment.total_marks}"


class SubjectComment(TimeStamped):
    """What the subject teacher writes about a student for the term. Printed on the report card."""

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="subject_comments")
    assignment = models.ForeignKey(TeachingAssignment, on_delete=models.CASCADE, related_name="comments")
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name="subject_comments")
    text = models.CharField(max_length=300, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["student", "assignment", "term"], name="one_comment_per_student_subject_term"),
        ]

    def __str__(self):
        return f"{self.student} - {self.assignment.subject}: {self.text[:40]}"
