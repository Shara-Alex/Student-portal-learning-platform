import { useOnline } from "@/lib/online";
import { useCurrentPeriod, useSchoolTimeZone } from "@/lib/schoolDay";
import { currentTerm, termAndWeek } from "@/lib/term";
import { useSchool, useTerms } from "@/modules/core/api";
import { useEffect, useState } from "react";
import { useMyDay } from "./useMyDay";

/**
 * Homeroom's StatusFooter: a 32px bar for glancing, never clicking.
 * Left: online or not, and where we are in the school year. Centre: the period on now.
 * Right: a live clock. On phones the school name and version hide; the clock always stays.
 */
export function StatusFooter() {
  const school = useSchool();
  const terms = useTerms();
  const online = useOnline();
  const timeZone = useSchoolTimeZone();
  // Whose lesson to show: a teacher's own, or a student's class. Others see just the period.
  const now = useCurrentPeriod(useMyDay(), timeZone);
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
