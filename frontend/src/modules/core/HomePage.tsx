import { Card } from "@/components/ui/card";
import { ALL_STAFF, inGroup } from "@/lib/roles";
import { daysUntil } from "@/lib/term";
import { useSubjects } from "@/modules/academics/api";
import { dateRange, useAnnouncements, useEvents } from "@/modules/events/api";
import { NoticeCard } from "@/modules/events/components/NoticesTab";
import { useClasses, useStudents } from "@/modules/students/api";
import { Link } from "react-router-dom";
import { useMe, useSchool } from "./api";
import { DayStrip } from "./today/DayStrip";
import { FamilyToday } from "./today/FamilyToday";
import { TermProgress } from "./today/TermProgress";
import { TodoList } from "./today/TodoList";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

const heading = (text: string) => <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{text}</h2>;

/**
 * Home is "Today" (Homeroom's rule: start from the day, not the database).
 * Each role gets its own: teachers their lessons and jobs, the admin whole-school figures,
 * the bursar and front office their own jobs, families their children. The apps are in the sidebar.
 */
export function HomePage() {
  const me = useMe();
  const school = useSchool();
  const role = me.data?.role;
  const isStaff = inGroup(role, ALL_STAFF);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting()}{me.data ? `, ${me.data.first_name || me.data.username}` : ""}
        </h1>
        <p className="text-ink-muted">{school.data?.name ?? "School not set up yet. Add it in /admin."}</p>
      </div>

      <TermProgress />

      {role === "teacher" && (
        <section className="space-y-2">
          {heading("Your lessons today")}
          <DayStrip filters={{ teacher: "me" }} detail={(e) => e.school_class_name} />
        </section>
      )}
      {role === "admin" && <SchoolStats />}
      {isStaff && role && (
        <section className="space-y-2">
          {heading("To do")}
          <TodoList role={role} />
        </section>
      )}
      {role && !isStaff && <FamilyToday />}

      {/* On wide screens the rail on the right already shows these two, so they hide here (styles/app.css). */}
      <div className="rail-has-this">
        <div className="grid gap-6 lg:grid-cols-2">
          <Notices />
          <ComingUp />
        </div>
      </div>
    </div>
  );
}

/** Real counts only. A separate component so families never ask for these staff lists. */
function SchoolStats() {
  const students = useStudents({ status: "active", page_size: 1 }); // we only need the total count
  const classes = useClasses();
  const subjects = useSubjects();
  const stats = [
    { label: "Active students", value: students.data?.count },
    { label: "Classes", value: classes.data?.length },
    { label: "Subjects", value: subjects.data?.length },
  ];
  return (
    <div className="hr-stats !grid-cols-3 !p-0">
      {stats.map((s) => (
        <div key={s.label} className="hr-stat"><div className="k">{s.label}</div><div className="v">{s.value ?? "–"}</div></div>
      ))}
    </div>
  );
}

function Notices() {
  const notices = useAnnouncements();
  const latest = (notices.data ?? []).slice(0, 3);
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">{heading("Notice board")}<Link to="/events?tab=notices" className="text-sm font-bold text-board">See all</Link></div>
      {latest.map((n) => <NoticeCard key={n.id} notice={n} />)}
      {!latest.length && <Card className="text-ink-muted">No notices at the moment.</Card>}
    </section>
  );
}

function ComingUp() {
  const events = useEvents(true);
  const next = (events.data ?? []).slice(0, 5);
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">{heading("Coming up")}<Link to="/events" className="text-sm font-bold text-board">Calendar</Link></div>
      <Card className="!p-0">
        {next.map((e) => (
          <div key={e.id} className="flex items-baseline gap-3 border-b border-dashed border-line px-4 py-2 last:border-0">
            <span className="w-32 shrink-0 font-mono text-sm text-ink-muted">{dateRange(e.start_date, e.end_date)}</span>
            <span className="font-bold">{e.title}</span>
            {daysUntil(e.start_date) <= 0 && <span className="ml-auto text-sm font-bold text-bus-ink">now</span>}
          </div>
        ))}
        {!next.length && <p className="p-4 text-ink-muted">Nothing on the calendar.</p>}
      </Card>
    </section>
  );
}
