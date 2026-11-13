"""
Writing to the audit trail. Every audited change in the system is listed in this file,
so this is the one place to read to know what is (and is not) recorded.

Each log_...() function must be called INSIDE the transaction that makes the change:

    with transaction.atomic():
        payment = serializer.save()
        log_payment_recorded(request.user, payment)

Then the change and its entry are saved together or not at all.
Passwords are never written here, not even as a hash; only the fact that one was set.
"""
from decimal import Decimal

from apps.core.models import School

from .models import AuditEntry

Action = AuditEntry.Action

USER_FIELDS = ["username", "first_name", "last_name", "email", "phone", "role", "is_active"]


# ---- the general tools ---------------------------------------------------------
def plain(value):
    """A value as JSON can store it and a person would read it. Decimal("45.00") -> "45"."""
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, Decimal):
        return f"{value.normalize():f}"
    return str(value)  # dates and anything else


def changed(before, after):
    """{field: [old, new]} for each field in `after` whose value is different in `before`."""
    return {
        field: [plain(before.get(field)), plain(new)]
        for field, new in after.items()
        if plain(before.get(field)) != plain(new)
    }


def entry(user, action, summary, target=None, target_type="", changes=None, student=None):
    """An unsaved entry. record() saves one; bulk_create saves many in one query."""
    signed_in = user is not None and user.is_authenticated
    return AuditEntry(
        actor=user if signed_in else None,
        actor_name=(user.get_full_name() or user.username) if signed_in else "System",
        actor_role=user.role if signed_in else "",
        action=action,
        summary=summary[:300],
        target_type=target_type or (target._meta.model_name if target is not None else ""),
        target_id=getattr(target, "pk", None),
        changes=changes or {},
        student=student,
    )


def record(user, action, summary, **kwargs):
    item = entry(user, action, summary, **kwargs)
    item.save()
    return item


def money(amount):
    school = School.current()
    return f"{school.currency if school else ''} {amount:,.2f}".strip()


def shown(value):
    """How a value is written in a summary sentence."""
    return "blank" if value in (None, "") else str(plain(value))


# ---- marks -------------------------------------------------------------------
def log_marks(user, assessment, before, entries):
    """
    One entry per student whose score or comment really changed.
    `before` is {student_id: Mark} read BEFORE saving. Re-saving an unchanged sheet logs nothing.
    """
    from apps.students.models import Student

    blank = {"score": None, "comment": ""}
    diffs = {}
    for line in entries:
        old = before.get(line["student"])
        was = {"score": old.score, "comment": old.comment} if old else blank
        diff = changed(was, {"score": line["score"], "comment": line.get("comment", "")})
        if diff:
            diffs[line["student"]] = diff
    if not diffs:
        return 0

    students = Student.objects.in_bulk(list(diffs))
    marks = {m.student_id: m for m in assessment.marks.filter(student_id__in=list(diffs))}
    where = f"{assessment.name} ({assessment.assignment.subject.name}, {assessment.assignment.school_class.name})"
    items = []
    for student_id, diff in diffs.items():
        student = students[student_id]
        parts = []
        if "score" in diff:
            parts.append(f"score {shown(diff['score'][0])} to {shown(diff['score'][1])} out of {assessment.total_marks}")
        if "comment" in diff:
            parts.append("comment changed")
        items.append(entry(
            user, Action.MARK_CHANGED, f"{student.full_name}, {where}: {'; '.join(parts)}",
            target=marks.get(student_id), target_type="mark", changes=diff, student=student,
        ))
    AuditEntry.objects.bulk_create(items)
    return len(items)


def log_assessment_deleted(user, assessment):
    """Deleting an assessment deletes its marks with it, so say how many were lost."""
    marked = assessment.marks.filter(score__isnull=False).count()
    where = f"{assessment.assignment.subject.name}, {assessment.assignment.school_class.name}"
    record(
        user, Action.ASSESSMENT_DELETED,
        f"Deleted {assessment.name} ({where}) and its {marked} entered mark(s)",
        target=assessment, changes={"name": assessment.name, "total_marks": assessment.total_marks, "marks_lost": marked},
    )


# ---- money -------------------------------------------------------------------
def payment_details(payment):
    return {field: plain(getattr(payment, field)) for field in ("amount", "date", "method", "reference")} | {
        "invoice": payment.invoice.number
    }


def log_payment_recorded(user, payment):
    invoice = payment.invoice
    record(
        user, Action.PAYMENT_RECORDED,
        f"Recorded {money(payment.amount)} ({payment.get_method_display()}) on {invoice.number} for {invoice.student.full_name}",
        target=payment, changes=payment_details(payment), student=invoice.student,
    )


def log_payment_deleted(user, payment):
    """Called before the delete, while the payment still exists. The details are kept in full."""
    invoice = payment.invoice
    record(
        user, Action.PAYMENT_DELETED,
        f"Deleted a payment of {money(payment.amount)} dated {payment.date:%d %b %Y} from {invoice.number} for {invoice.student.full_name}",
        target=payment, changes=payment_details(payment), student=invoice.student,
    )


def log_invoice_deleted(user, invoice):
    record(
        user, Action.INVOICE_DELETED,
        f"Deleted invoice {invoice.number} ({invoice.term}) for {invoice.student.full_name}, total {money(invoice.total)}",
        target=invoice, changes={"number": invoice.number, "term": str(invoice.term), "total": plain(invoice.total)},
        student=invoice.student,
    )


# ---- who may sign in -----------------------------------------------------------
def user_snapshot(user):
    """The audited fields of a user, read BEFORE a change so it can be compared after."""
    return {field: getattr(user, field) for field in USER_FIELDS}


def name_of(user):
    return user.get_full_name() or user.username


def log_user_created(actor, user):
    record(
        actor, Action.USER_CREATED, f"Added {name_of(user)} ({user.username}) as {user.get_role_display()}",
        target=user, changes=changed({}, user_snapshot(user)),
    )


def log_user_changed(actor, user, before):
    diff = changed(before, user_snapshot(user))
    if not diff:
        return
    parts = []
    if "role" in diff:
        old = dict(type(user).Role.choices).get(diff["role"][0], diff["role"][0])
        parts.append(f"role {old} to {user.get_role_display()}")
    if "is_active" in diff:
        parts.append("reactivated" if user.is_active else "deactivated")
    details = [field.replace("_", " ") for field in diff if field not in ("role", "is_active")]
    if details:
        parts.append(f"changed {', '.join(details)}")
    record(actor, Action.USER_CHANGED, f"{name_of(user)}: {'; '.join(parts)}", target=user, changes=diff)


def log_password_set(actor, user):
    record(actor, Action.PASSWORD_SET, f"Set a new password for {name_of(user)} ({user.username})", target=user)


def log_login_created(actor, user, owner, student=None):
    """A parent or student login, made from the guardian's or student's own record."""
    record(
        actor, Action.LOGIN_CREATED,
        f"Created {user.get_role_display().lower()} login '{user.username}' for {owner.full_name}",
        target=user, student=student,
    )
