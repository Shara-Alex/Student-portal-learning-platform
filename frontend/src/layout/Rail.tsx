import { Badge } from "@/components/ui/badge";
import { useCurrentPeriod, useSchoolTimeZone } from "@/lib/schoolDay";
import { cn } from "@/lib/utils";
import { useMe } from "@/modules/core/api";
import { useAnnouncements, useEvents } from "@/modules/events/api";
import { useStudents } from "@/modules/students/api";
import type { Student } from "@/modules/students/types";
import { Link } from "react-router-dom";
import { useMyDay } from "./useMyDay";

const hhmm = (time: string) => time.slice(0, 5);
const shortDate = (iso: string) => new Date(`${iso}T00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
// The small link in a card's heading. The heading is uppercase; the link is not.
const headLink = "text-xs font-bold normal-case tracking-normal text-board";

/**
 * Homeroom's right rail: what is happening, at a glance. At most three quiet cards:
 * Right now, Coming up, Notices. Information only: no forms, at most one link per card.
 * It hides by itself below 1280px wide, and the panel button in the tab bar closes it.
 */
export function Rail() {
  const role = useMe().data?.role;
  return (
    <aside className="hr-rail" aria-label="At a glance">
      {role === "parent" ? <ChildrenNow /> : <RightNow />}
      <ComingUp />
      <Notices />
    </aside>
  );
}

/** The lesson on now for a teacher or a student; just the period for everyone else. */
function RightNow() {
  const whose = useMyDay();
  const now = useCurrentPeriod(whose, useSchoolTimeZone());
  const lesson = now?.lesson;

  let body = <div className="sub">No lesson on at the moment.</div>;
  if (now) {
    // A break, or someone with no timetable of their own: name the period. Otherwise a gap is a free period.
    const title = lesson?.subject_name ?? (now.period.is_break || !whose ? now.period.name : "Free period");
    // A teacher wants to know which class; a student wants to know which teacher.
    const who = lesson && (whose?.teacher ? lesson.school_class_name : lesson.teacher_name);
    const next = now.next && (now.next.lesson?.subject_name ?? (now.next.period.is_break || !whose ? now.next.period.name : "Free period"));
    body = (
      <>
        <div className="subj-line">
          <span className="big">{title}</span>
          {lesson && <span className="hr-subj">{now.period.name}</span>}
        </div>
        <div className="sub">{[who, lesson?.room, `until ${hhmm(now.period.end_time)}`].filter(Boolean).join(" · ")}</div>
        <div className="meter"><i style={{ width: `${now.percent}%` }} /></div>
        {now.next && (
          <div className="next"><span className="text-ink-muted">Next</span> · <b>{next}</b> {hhmm(now.next.period.start_time)}</div>
        )}
      </>
    );
  }
  // s-<group> gives the card its subject's colour (title, tag and meter).
  return (
    <section className={cn("hr-now", lesson && `s-${lesson.subject_group}`)}>
      <h3>Right now</h3>
      {body}
    </section>
  );
}

/** A parent sees one line per child: what each is in right now. */
function ChildrenNow() {
  // The server only ever sends a parent their own children.
  const children = useStudents({}).data?.results ?? [];
  return (
    <section className="hr-now">
      <h3>Right now</h3>
      {children.map((child) => <ChildNow key={child.id} child={child} />)}
      {!children.length && <div className="sub">No children are linked to your login yet.</div>}
    </section>
  );
}

function ChildNow({ child }: { child: Student }) {
  const now = useCurrentPeriod(child.current_class ? { school_class: String(child.current_class) } : null, useSchoolTimeZone());
  const what = !now ? "No lesson now" : now.lesson?.subject_name ?? (now.period.is_break ? now.period.name : "Free period");
  return (
    <div className={cn("hr-mini items-baseline", now?.lesson && `s-${now.lesson.subject_group}`)}>
      <span className="w-20 shrink-0 truncate text-ink-muted">{child.first_name}</span>
      <b className="min-w-0 truncate">{what}</b>
      {now && <span className="ml-auto font-mono text-ink-muted">{hhmm(now.period.end_time)}</span>}
    </div>
  );
}

function ComingUp() {
  const events = useEvents(true);
  const next = (events.data ?? []).slice(0, 3);
  return (
    <section>
      <h3>Coming up <Link to="/events" className={headLink}>Calendar</Link></h3>
      {next.map((e) => (
        <div key={e.id} className="hr-mini"><span className="d">{shortDate(e.start_date)}</span><b>{e.title}</b></div>
      ))}
      {events.data && !next.length && <div className="hr-mini text-ink-muted">Nothing on the calendar.</div>}
    </section>
  );
}

function Notices() {
  const notices = useAnnouncements();
  const latest = (notices.data ?? []).slice(0, 2); // the API puts pinned notices first
  return (
    <section>
      <h3>Notices <Link to="/events?tab=notices" className={headLink}>Notice board</Link></h3>
      {latest.map((n, i) => (
        <div key={n.id} className={cn(i > 0 && "border-t border-dashed border-line pt-2")}>
          {n.pinned && <Badge tone="wait">Pinned</Badge>}
          <div className="font-bold">{n.title}</div>
          <div className="line-clamp-2 text-sm text-ink-muted">{n.body}</div>
        </div>
      ))}
      {notices.data && !latest.length && <div className="hr-mini text-ink-muted">No notices at the moment.</div>}
    </section>
  );
}
