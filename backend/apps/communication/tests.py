from django.test import TestCase
from rest_framework.test import APIClient

from apps.core.models import User


class MessagesApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.teacher = User.objects.create_user("teacher", password="x", role="teacher", first_name="Grace", last_name="Banda")
        self.parent = User.objects.create_user("parent", password="x", role="parent", first_name="Mary", last_name="Moyo")
        self.other_parent = User.objects.create_user("other", password="x", role="parent")

    def send(self, sender, recipient, subject="Hello", **extra):
        self.client.force_authenticate(sender)
        body = {"recipient": recipient.id, "subject": subject, "body": "Text", **extra}
        return self.client.post("/api/communication/messages/", body, format="json")

    def test_send_read_and_reply(self):
        first = self.send(self.parent, self.teacher, "Homework")
        self.assertEqual(first.status_code, 201, first.data)
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self.client.get("/api/communication/messages/unread/").data, {"count": 1})
        inbox = self.client.get("/api/communication/messages/").data["results"]
        self.assertEqual([(m["subject"], m["sender_name"], m["is_read"]) for m in inbox], [("Homework", "Mary Moyo", False)])
        self.client.get(f"/api/communication/messages/{first.data['id']}/")  # opening it marks it read
        self.assertEqual(self.client.get("/api/communication/messages/unread/").data, {"count": 0})
        reply = self.send(self.teacher, self.parent, "Re: Homework", reply_to=first.data["id"])
        self.assertEqual(reply.status_code, 201)
        sent = self.client.get("/api/communication/messages/?box=sent").data["results"]
        self.assertEqual([m["subject"] for m in sent], ["Re: Homework"])

    def test_parents_write_to_staff_only_and_messages_are_private(self):
        self.assertEqual(self.send(self.parent, self.other_parent).status_code, 400)
        self.assertEqual(self.send(self.parent, self.parent).status_code, 400)
        message = self.send(self.parent, self.teacher).data["id"]
        self.client.force_authenticate(self.other_parent)
        self.assertEqual(self.client.get(f"/api/communication/messages/{message}/").status_code, 404)
        self.assertEqual(self.client.delete(f"/api/communication/messages/{message}/").status_code, 405)

    def test_recipient_list_depends_on_role(self):
        self.client.force_authenticate(self.parent)
        self.assertEqual([p["name"] for p in self.client.get("/api/communication/messages/recipients/").data], ["Grace Banda"])
        self.client.force_authenticate(self.teacher)
        self.assertEqual(len(self.client.get("/api/communication/messages/recipients/").data), 2)
        self.assertEqual([p["name"] for p in self.client.get("/api/communication/messages/recipients/?search=moy").data], ["Mary Moyo"])
