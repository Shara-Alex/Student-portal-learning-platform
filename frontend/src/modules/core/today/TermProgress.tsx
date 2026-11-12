import { currentTerm, daysUntil, termAndWeek, termProgress } from "@/lib/term";
import { useEvents } from "@/modules/events/api";
import { useTerms } from "../api";

/** Homeroom's TermProgress: where we are in the term, and the next thing on the calendar. */
export function TermProgress() {
  const term = currentTerm(useTerms().data?.results);
  const events = useEvents(true);
  if (!term) return null;

  const { percent, weeksLeft } = termProgress(term);
  // The next event that has not started yet.
  const next = events.data?.find((e) => daysUntil(e.start_date) >= 0);
  const days = next ? daysUntil(next.start_date) : 0;
  const milestone = next
    ? `${next.title} ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`
    : `${weeksLeft} week${weeksLeft === 1 ? "" : "s"} left`;

  return (
    <div className="hr-term" role="img" aria-label={`${termAndWeek(term)}, ${Math.round(percent)} percent of the term gone`}>
      <b>{termAndWeek(term)}</b>
      <span className="bar"><i style={{ width: `${percent}%` }} /></span>
      <span>{milestone}</span>
    </div>
  );
}
