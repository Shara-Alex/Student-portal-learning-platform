import { api } from "@/lib/api";
import { useRemove, useSave } from "@/lib/crud";
import { useQuery } from "@tanstack/react-query";
import type { Announcement, AnnouncementInput, EventInput, SchoolEvent } from "./types";

const BASE = "/api/events";

/** upcoming = only events still to come or happening now. */
export const useEvents = (upcoming: boolean) =>
  useQuery({ queryKey: ["events", upcoming], queryFn: () => api.get<SchoolEvent[]>(`${BASE}/events/${upcoming ? "?upcoming=1" : ""}`) });

export const useAnnouncements = () =>
  useQuery({ queryKey: ["announcements"], queryFn: () => api.get<Announcement[]>(`${BASE}/announcements/`) });

export const useSaveEvent = () => useSave<EventInput, SchoolEvent>(`${BASE}/events`, ["events"]);
export const useDeleteEvent = () => useRemove(`${BASE}/events`, ["events"]);
export const useSaveAnnouncement = () => useSave<AnnouncementInput, Announcement>(`${BASE}/announcements`, ["announcements"]);
export const useDeleteAnnouncement = () => useRemove(`${BASE}/announcements`, ["announcements"]);

/** "12 Nov" or "12 Nov to 15 Nov" */
export function dateRange(start: string, end: string | null) {
  const short = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return end && end !== start ? `${short(start)} to ${short(end)}` : short(start);
}
