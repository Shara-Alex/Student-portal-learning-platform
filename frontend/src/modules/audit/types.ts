// Mirrors backend/apps/audit/serializers.py. Keep them in sync.
// Audit has no app of its own in the sidebar: its screen is a tab in Settings (admins only).
import type { Role } from "@/modules/core/types";

export type Action =
  | "mark_changed" | "assessment_deleted"
  | "payment_recorded" | "payment_deleted" | "invoice_deleted"
  | "user_created" | "user_changed" | "password_set" | "login_created";

/** One thing somebody changed. The backend never lets an entry be edited or deleted. */
export interface AuditEntry {
  id: number;
  at: string;                 // when it happened
  actor: number | null;       // the user who did it (null if that user no longer exists)
  actor_name: string;         // copied at the time, so it still reads right after a rename
  actor_role: Role | "";
  action: Action;
  action_label: string;       // "Mark changed"
  target_type: string;        // what it was done to: "mark", "payment", "user"...
  target_id: number | null;
  summary: string;            // one sentence a person can read
  // Either {field: [old, new]} for an edit, or {field: value} describing something added or deleted.
  changes: Record<string, unknown>;
  student: number | null;     // the student it concerns, if any
  student_name: string;
}

/** The choices in the "what happened" dropdown, grouped the way a school thinks about them. */
export const ACTION_GROUPS: { label: string; actions: { key: Action; label: string }[] }[] = [
  { label: "Marks", actions: [
    { key: "mark_changed", label: "Mark changed" },
    { key: "assessment_deleted", label: "Assessment deleted" },
  ] },
  { label: "Money", actions: [
    { key: "payment_recorded", label: "Payment recorded" },
    { key: "payment_deleted", label: "Payment deleted" },
    { key: "invoice_deleted", label: "Invoice deleted" },
  ] },
  { label: "Logins", actions: [
    { key: "user_created", label: "User added" },
    { key: "user_changed", label: "User changed" },
    { key: "password_set", label: "Password set by an administrator" },
    { key: "login_created", label: "Family login created" },
  ] },
];
