"""
The arithmetic of results, kept in one place and away from the web layer.

How a term mark for one subject is worked out:
  1. coursework % = marks scored / marks available, over every coursework assessment that was marked
  2. exam %       = the same, over the exams
  3. final %      = coursework % x coursework weight + exam % x exam weight
                    (if only one of the two exists yet, the final is just that one)
  4. grade        = the band on the grading scale that the final % reaches
  5. passed       = final % is at or above the school's pass mark
"""
from collections import defaultdict

from apps.students.services import class_students

from .models import AssessmentSettings, GradeScale, Mark, SubjectComment


def percent(scored, available):
    return round(100 * float(scored) / float(available), 1) if available else None


def combine(coursework, exam, coursework_weight):
    """Blend the two percentages. Either may be None (nothing marked yet)."""
    if coursework is None:
        return exam
    if exam is None:
        return coursework
    return round(coursework * coursework_weight / 100 + exam * (100 - coursework_weight) / 100, 1)


def get_bands():
    """The default scale's bands, highest first."""
    return list(GradeScale.default().bands.all())


def grade_for(value, bands):
    """The first (highest) band whose threshold the mark reaches."""
    if value is None:
        return None
    for band in bands:
        if value >= float(band.min_percent):
            return band
    return None


def summarise(totals, settings, bands):
    """totals = {"coursework": [scored, available], "exam": [scored, available]} -> the result figures."""
    coursework = percent(*totals["coursework"])
    exam = percent(*totals["exam"])
    final = combine(coursework, exam, settings.coursework_weight)
    band = grade_for(final, bands)
    return {
        "coursework": coursework,
        "exam": exam,
        "final": final,
        "grade": band.symbol if band else "",
        "remark": band.remark if band else "",
        "passed": None if final is None else final >= settings.pass_mark,
    }


def new_totals():
    return {"coursework": [0, 0], "exam": [0, 0]}


def subject_results(student_ids, term_ids):
    """
    Results for many students and terms in ONE database query.
    Returns {(student_id, term_id): [ {subject, group, teacher, coursework, exam, final, grade, ...}, ... ]}
    """
    settings = AssessmentSettings.current()
    bands = get_bands()
    marks = Mark.objects.filter(
        student_id__in=student_ids, assessment__term_id__in=term_ids, score__isnull=False
    ).select_related("assessment__assignment__subject", "assessment__assignment__teacher")

    # (student, term) -> subject id -> running totals
    totals = defaultdict(lambda: defaultdict(new_totals))
    subjects = {}
    for mark in marks:
        assessment = mark.assessment
        assignment = assessment.assignment
        subjects[assignment.subject_id] = (assignment.subject.name, assignment.subject.group, str(assignment.teacher))
        bucket = totals[(mark.student_id, assessment.term_id)][assignment.subject_id][assessment.category]
        bucket[0] += mark.score
        bucket[1] += assessment.total_marks

    results = {}
    for key, by_subject in totals.items():
        rows = []
        for subject_id, subject_totals in by_subject.items():
            name, group, teacher = subjects[subject_id]
            rows.append({
                "subject_id": subject_id, "subject": name, "group": group, "teacher": teacher,
                **summarise(subject_totals, settings, bands),
            })
        results[key] = sorted(rows, key=lambda row: row["subject"])
    return results


def overall(rows, bands):
    """The average of the subject finals, with its grade."""
    finals = [row["final"] for row in rows if row["final"] is not None]
    average = round(sum(finals) / len(finals), 1) if finals else None
    band = grade_for(average, bands)
    return {"average": average, "grade": band.symbol if band else ""}


def gradebook(assignment, term):
    """One class, one subject, one term: every student against every assessment, plus their term result."""
    settings = AssessmentSettings.current()
    bands = get_bands()
    comments = dict(SubjectComment.objects.filter(assignment=assignment, term=term).values_list("student_id", "text"))
    assessments = list(assignment.assessments.filter(term=term))
    by_id = {a.id: a for a in assessments}

    scores = defaultdict(dict)  # student id -> assessment id -> score
    for mark in Mark.objects.filter(assessment__in=assessments, score__isnull=False):
        scores[mark.student_id][mark.assessment_id] = mark.score

    rows = []
    for student in class_students(assignment.school_class, assignment.year):
        totals = new_totals()
        for assessment_id, score in scores[student.id].items():
            bucket = totals[by_id[assessment_id].category]
            bucket[0] += score
            bucket[1] += by_id[assessment_id].total_marks
        rows.append({
            "student": student.id,
            "admission_number": student.admission_number,
            "full_name": student.full_name,
            # JSON object keys are always text, so the assessment id is turned into a string here.
            "marks": {str(a.id): float(scores[student.id][a.id]) if a.id in scores[student.id] else None for a in assessments},
            "comment": comments.get(student.id, ""),
            **summarise(totals, settings, bands),
        })
    return assessments, rows


def report_card(student, term):
    bands = get_bands()
    enrolment = student.enrolments.filter(year=term.year).select_related("school_class__class_teacher").first()
    school_class = enrolment.school_class if enrolment else None

    # Work out the whole class in one go, so each subject can show "position 4 of 38".
    classmates = set(class_students(school_class, term.year).values_list("id", flat=True)) if school_class else set()
    everyone = subject_results(classmates | {student.id}, [term.id])
    rows = everyone.get((student.id, term.id), [])
    finals = defaultdict(list)  # subject id -> every classmate's final mark
    for (student_id, _), their_rows in everyone.items():
        if student_id in classmates:
            for row in their_rows:
                if row["final"] is not None:
                    finals[row["subject_id"]].append(row["final"])

    comments = dict(
        SubjectComment.objects.filter(student=student, term=term).values_list("assignment__subject_id", "text")
    )
    for row in rows:
        others = finals[row["subject_id"]]
        placed = row["final"] is not None and student.id in classmates
        # Position = one more than the number of classmates who did better (so ties share a place).
        row["position"] = 1 + sum(1 for mark in others if mark > row["final"]) if placed else None
        row["out_of"] = len(others) if placed else None
        row["comment"] = comments.get(row["subject_id"], "")

    return {
        "student": {"id": student.id, "full_name": student.full_name, "admission_number": student.admission_number},
        "term": {"id": term.id, "name": term.name, "year": term.year.name},
        "school_class": school_class.name if school_class else "",
        "class_teacher": str(school_class.class_teacher) if school_class and school_class.class_teacher else "",
        "coursework_weight": AssessmentSettings.current().coursework_weight,
        "pass_mark": AssessmentSettings.current().pass_mark,
        "subjects": rows,
        **overall(rows, bands),
    }


def transcript(student):
    """Every term the student has marks in, oldest first."""
    from apps.core.models import Term

    bands = get_bands()
    terms = Term.objects.filter(assessments__marks__student=student).distinct().select_related("year").order_by("start_date")
    results = subject_results([student.id], [t.id for t in terms])
    return [
        {
            "term": {"id": term.id, "name": term.name, "year": term.year.name},
            "subjects": results.get((student.id, term.id), []),
            **overall(results.get((student.id, term.id), []), bands),
        }
        for term in terms
    ]


def class_results(school_class, term):
    """One line per student for the report card list: how many subjects, their average and grade."""
    bands = get_bands()
    students = list(class_students(school_class, term.year))
    results = subject_results([s.id for s in students], [term.id])
    return [
        {
            "student": s.id,
            "admission_number": s.admission_number,
            "full_name": s.full_name,
            "subjects": len(results.get((s.id, term.id), [])),
            **overall(results.get((s.id, term.id), []), bands),
        }
        for s in students
    ]
