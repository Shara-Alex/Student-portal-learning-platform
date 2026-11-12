// Mirrors backend/apps/events/serializers.py. Keep them in sync.
export type Audience = "everyone" | "staff";
export type EventKind = "event" | "exam" | "holiday" | "meeting" | "sport";

export interface SchoolEvent {
  id: number;
  title: string;
  details: string;
  start_date: string;
  end_date: string | null;
  kind: EventKind;
  audience: Audience;
}
export type EventInput = Omit<SchoolEvent, "id">;

export interface Announcement {
  id: number;
  title: string;
  body: string;
  audience: Audience;
  pinned: boolean;
  publish_until: string | null;
  author_name: string;
  created_at: string;
}
export type AnnouncementInput = Pick<Announcement, "title" | "body" | "audience" | "pinned" | "publish_until">;

export const EVENT_KINDS: { value: EventKind; label: string }[] = [
  { value: "event", label: "Event" },
  { value: "exam", label: "Exams" },
  { value: "holiday", label: "Holiday" },
  { value: "meeting", label: "Meeting" },
  { value: "sport", label: "Sport" },
];
