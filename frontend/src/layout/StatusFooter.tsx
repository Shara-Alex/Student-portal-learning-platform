import { useCurrentPeriod, useSchoolTimeZone } from "@/lib/schoolDay";
import { currentTerm, termAndWeek } from "@/lib/term";
import { useMe, useSchool, useTerms } from "@/modules/core/api";
import { useStudents } from "@/modules/students/api";
import { useEffect, useState } from "react";

/**
 * Homeroom's StatusFooter: a 32px bar for glancing, never clicking.
 * Left: online or not, and where we are in the school year. Centre: the period on now.
 * Right: a live clock. On phones the school name and version hide; the clock always stays.
 */
export function StatusFooter() {
  const me = useMe();
  const school = useSchool();
  const terms = useTerms();
  const online = useOnline();
  const timeZone = useSchoolTimeZone();
  const role = me.data?.role;
  // A student's own record, to know their class. Nobody else asks for it.
  const self = useStudents({}, role === "student");
  const ownClass = self.data?.results[0]?.current_class;

  // Whose lesson to show: a teacher's own, or a student's class. Others see just the period.
  const filters = role === "teacher" ? { teacher: "me" } : role === "student" && ownClass ? { school_class: String(ownClass) } : null;
  const now = useCurrentPeriod(filters, timeZone);
  const where = termAndWeek(currentTerm(terms.data?.results));

  return (
    <footer className="hr-foot">
      <span className={online ? "online" : "online off"}>{online ? "Online" : "Offline"}</span>
      <span className="sep" />
      <span className="min-w-0 truncate">
        <span className="hide-phone">{school.data?.name}{school.data && where && " · "}</span>
        {where}
      </span>
      {/* Always drawn, even when empty, so the clock stays on the right. s-<group> colours the subject. */}
      <span className={now?.lesson ? `mid s-${now.lesson.subject_group}` : "mid"}>
        {now && (now.period.is_break
          ? `${now.period.name} until ${now.period.end_time.slice(0, 5)}`
          : <>{now.period.name}{now.lesson && <> · <b>{now.lesson.subject_name}</b></>} · {now.minutesLeft} min left</>)}
      </span>
      <Clock timeZone={timeZone} />
      <span className="sep hide-phone" />
      <span className="hide-phone">v{__APP_VERSION__}</span>
    </footer>
  );
}

/**
 * Its own small component on purpose: it redraws every second, and only this
 * piece of the screen needs to. The rest of the footer is left alone.
 */
function Clock({ timeZone }: { timeZone?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const day = now.toLocaleDateString("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short" });
  const time = now.toLocaleTimeString("en-GB", { timeZone });
  return <span className="clock">{day} · {time}</span>;
}

/** True while the browser has a network connection. The browser tells us when that changes. */
function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);
  return online;
}
