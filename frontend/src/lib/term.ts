/** Small sums about the school term, used by the top bar and the Today screen. */
import type { Term } from "@/modules/core/types";

const DAY = 86_400_000; // milliseconds in a day
const start = (iso: string) => new Date(`${iso}T00:00`).getTime();

export const currentTerm = (terms: Term[] | undefined) => terms?.find((t) => t.is_current);

/** Week 1 starts on the term's first day. Returns 0 before the term has started. */
export function weekOf(term: Term, now = Date.now()) {
  const days = Math.floor((now - start(term.start_date)) / DAY);
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
}

/** "Term 1 · Week 5": the school's clock. */
export function termAndWeek(term: Term | undefined) {
  if (!term) return "";
  const week = weekOf(term);
  return week ? `${term.name} · Week ${week}` : term.name;
}

/** How far through the term we are, 0 to 100, and how many weeks are left. */
export function termProgress(term: Term, now = Date.now()) {
  const from = start(term.start_date);
  const to = start(term.end_date) + DAY;
  const percent = Math.min(100, Math.max(0, ((now - from) / (to - from)) * 100));
  const weeksLeft = Math.max(0, Math.ceil((to - now) / (7 * DAY)));
  return { percent, weeksLeft };
}

/** Whole days from today until a date ("2026-11-20"). 0 = today, negative = already passed. */
export function daysUntil(iso: string, now = Date.now()) {
  return Math.round((start(iso) - new Date(new Date(now).toDateString()).getTime()) / DAY);
}
