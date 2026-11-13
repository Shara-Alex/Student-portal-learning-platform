// Mirrors backend/apps/notifications/serializers.py. Keep them in sync.
// Notifications has no app of its own in the sidebar: its screens live in Settings (admin) and Fees (reminders).
import type { Tone } from "@/components/ui/badge";

/** Which automatic emails are switched on (one row for the whole school). */
export interface NotificationSettings {
  absence: boolean; // email guardians when their child is marked absent
  payment: boolean; // email guardians a receipt when a payment is recorded
  notice: boolean;  // email new notices to the people they are for
}

export type Kind = "absence" | "fee_reminder" | "payment" | "notice";
export type Status = "pending" | "sent" | "failed";

/** One email the school sent, or tried to send. */
export interface Notification {
  id: number;
  kind: Kind;
  kind_label: string;       // "Fee reminder"
  channel: string;          // "email" (WhatsApp later)
  to: string;               // the address it went to
  recipient_name: string;
  student: number | null;   // the student it was about, if any
  student_name: string;
  subject: string;
  body: string;
  status: Status;
  attempts: number;         // how many times sending was tried
  error: string;            // why the last try failed ("" when it did not)
  created_at: string;
  sent_at: string | null;   // null until it actually went out
}

export const KINDS: { key: Kind; label: string }[] = [
  { key: "absence", label: "Absence" },
  { key: "fee_reminder", label: "Fee reminder" },
  { key: "payment", label: "Payment receipt" },
  { key: "notice", label: "Notice" },
];

/** How each status is shown. The design's yellow means "waiting", red means "something went wrong". */
export const STATUS: Record<Status, { label: string; tone: Tone }> = {
  pending: { label: "Waiting", tone: "wait" },
  sent: { label: "Sent", tone: "good" },
  failed: { label: "Failed", tone: "bad" },
};
