"""
The rules of notifications, in one place.

Every notification goes through the same two steps:

  1. queue()   save a row saying "tell this person this" (status: pending)
  2. send()    try to deliver it, and mark it sent or failed

Small batches are sent straight away. Big ones (a notice to every family) are
left pending, so the person who clicked Save is not kept waiting; they go out
with the "send pending" button or the scheduled `send_notifications` command.
"""
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.core.models import School, User
from apps.core.permissions import ALL_STAFF
from apps.students.models import Guardian

from .channels import deliver
from .models import Notification, NotificationSettings

MAX_ATTEMPTS = 3  # after three failures a message is left alone for a person to look at
SEND_NOW_LIMIT = 20  # batches up to this size are sent while the user waits


# ---- step 1: queue -----------------------------------------------------------
def queue(kind, to, subject, body, name="", student=None, key=None):
    """Save one notification. Returns it, or None if there is no address or it was already queued."""
    if not to:
        return None
    try:
        with transaction.atomic():  # so a refused duplicate does not spoil a transaction we are inside
            return Notification.objects.create(
                kind=kind, to=to, recipient_name=name, subject=subject, body=body, student=student, dedupe_key=key
            )
    except IntegrityError:
        return None  # same dedupe_key: this person has already been told


# ---- step 2: send ------------------------------------------------------------
def send(notification):
    """Try to deliver one notification and record what happened."""
    notification.attempts += 1
    if deliver(notification):
        notification.status = Notification.Status.SENT
        notification.sent_at = timezone.now()
        notification.error = ""
    else:
        notification.status = Notification.Status.FAILED
        notification.error = "Could not be delivered. Check the address, and logs/app.log for the reason."
    notification.save(update_fields=["status", "attempts", "sent_at", "error", "updated_at"])
    return notification.status == Notification.Status.SENT


def send_batch(notifications):
    """Called right after queueing. Sends a small batch now; leaves a big one for later."""
    notifications = [n for n in notifications if n is not None]
    if settings.NOTIFICATIONS_SEND_NOW and len(notifications) <= SEND_NOW_LIMIT:
        for notification in notifications:
            send(notification)
    return len(notifications)


def send_pending(limit=200):
    """Send whatever is waiting, and retry failures that have not used up their attempts."""
    waiting = Notification.objects.filter(
        status__in=[Notification.Status.PENDING, Notification.Status.FAILED], attempts__lt=MAX_ATTEMPTS
    ).order_by("created_at")[:limit]
    sent = failed = 0
    for notification in waiting:
        if send(notification):
            sent += 1
        else:
            failed += 1
    return {"sent": sent, "failed": failed}


# ---- who to tell ---------------------------------------------------------------
def guardians_with_email(student):
    return [g for g in student.guardians.all() if g.email]


def sign_off():
    school = School.current()
    return f"\n\n{school.name if school else 'The school office'}"


def money(amount):
    school = School.current()
    return f"{school.currency if school else ''} {amount:,.2f}".strip()


# ---- the four kinds of notification ----------------------------------------------
def notify_absences(students, day):
    """Tell the guardians of each of these students that they were marked absent on `day`."""
    if not NotificationSettings.current().absence:
        return 0
    queued = []
    for student in students:
        for guardian in guardians_with_email(student):
            queued.append(queue(
                Notification.Kind.ABSENCE,
                guardian.email,
                f"{student.first_name} was marked absent",
                f"Dear {guardian.full_name},\n\n{student.full_name} was marked absent from school on {day:%A %d %B %Y}.\n"
                f"If you have not already told us why, please contact the school office." + sign_off(),
                name=guardian.full_name,
                student=student,
                key=f"absence:{student.id}:{day}:{guardian.email}",
            ))
    return send_batch(queued)


def notify_payment(payment):
    """A receipt to the guardians when a payment is recorded."""
    if not NotificationSettings.current().payment:
        return 0
    invoice = payment.invoice
    student = invoice.student
    queued = [
        queue(
            Notification.Kind.PAYMENT,
            guardian.email,
            f"Payment received for {student.first_name}",
            f"Dear {guardian.full_name},\n\nWe received {money(payment.amount)} on {payment.date:%d %B %Y} "
            f"towards {student.full_name}'s fees for {invoice.term} (invoice {invoice.number}).\n"
            f"Balance still to pay: {money(invoice.balance)}.\n\nThank you." + sign_off(),
            name=guardian.full_name,
            student=student,
            key=f"payment:{payment.id}:{guardian.email}",
        )
        for guardian in guardians_with_email(student)
    ]
    return send_batch(queued)


def notify_notice(announcement):
    """Email a new notice to the people it is for: staff, plus every guardian unless it is staff-only."""
    if not NotificationSettings.current().notice:
        return 0
    people = {}  # email -> name; a dict so nobody gets it twice (a teacher who is also a parent)
    for user in User.objects.filter(role__in=ALL_STAFF, is_active=True).exclude(email=""):
        people[user.email.lower()] = user.get_full_name() or user.username
    if announcement.audience == "everyone":
        for guardian in Guardian.objects.filter(students__status="active").exclude(email="").distinct():
            people.setdefault(guardian.email.lower(), guardian.full_name)
    queued = [
        queue(
            Notification.Kind.NOTICE,
            email,
            announcement.title,
            f"Dear {name},\n\n{announcement.body}" + sign_off(),
            name=name,
            key=f"notice:{announcement.id}:{email}",
        )
        for email, name in people.items()
    ]
    return send_batch(queued)


def queue_fee_reminders(invoices, overdue_only=True):
    """
    Remind the guardians of every invoice that still has money owing.
    Returns {"queued": messages created, "no_email": students nobody could be emailed about}.
    One reminder per invoice per guardian per day, however often the button is pressed.
    """
    today = timezone.localdate()
    queued, no_email = [], 0
    for invoice in invoices:
        if invoice.balance <= 0 or (overdue_only and invoice.status(today) != "overdue"):
            continue
        student = invoice.student
        guardians = guardians_with_email(student)
        if not guardians:
            no_email += 1
            continue
        overdue = invoice.due_now(today)
        owing = f"Amount overdue: {money(overdue)}.\n" if overdue > 0 else ""
        for guardian in guardians:
            queued.append(queue(
                Notification.Kind.FEE_REMINDER,
                guardian.email,
                f"Fees reminder for {student.first_name}",
                f"Dear {guardian.full_name},\n\nThis is a reminder about {student.full_name}'s fees for {invoice.term} "
                f"(invoice {invoice.number}).\n{owing}Total still to pay: {money(invoice.balance)}.\n\n"
                f"If you have paid in the last few days, please ignore this message." + sign_off(),
                name=guardian.full_name,
                student=student,
                key=f"fee:{invoice.id}:{today}:{guardian.email}",
            ))
    return {"queued": send_batch(queued), "no_email": no_email}
