"""
The ways a notification can leave the building. Email today.

To add WhatsApp later:
  1. write send_whatsapp(notification) below, returning True when the provider accepts it;
  2. add it to SENDERS;
  3. add WHATSAPP to Notification.Channel in models.py.
Nothing else in the system needs to change: everything else only ever calls deliver().
"""
from apps.core.emails import send_email


def send_by_email(notification):
    return send_email(notification.to, notification.subject, notification.body)


SENDERS = {
    "email": send_by_email,
}


def deliver(notification):
    """Hand one notification to its channel. True if it was accepted."""
    sender = SENDERS.get(notification.channel)
    return bool(sender and sender(notification))
