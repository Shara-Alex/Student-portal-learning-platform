import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { usePeriods, useTimetable } from "@/modules/academics/api";
import type { Filters } from "@/modules/academics/api";
import type { TimetableEntry } from "@/modules/academics/types";

/**
 * Homeroom's Today strip: the day as a row of periods.
 * Past periods fade, the current one is outlined and marked NOW, breaks are dashed gaps.
 * `filters` chooses whose day: {teacher: "me"} or {school_class: "3"}.
 */
export function DayStrip({ filters, detail }: { filters: Filters; detail: (entry: TimetableEntry) => string }) {
  const periods = usePeriods();
  const lessons = useTimetable(filters);
  const now = new Date();
  const weekday = now.getDay(); // 1 = Monday ... 5 = Friday, the same numbers the timetable uses
  const clock = now.toTimeString().slice(0, 8); // "10:15:00", comparable with "09:50:00" as text

  if (weekday < 1 || weekday > 5) return <Card className="text-ink-muted">No lessons today. Enjoy the weekend.</Card>;
  if (!periods.data?.length) return null;
  const today = new Map((lessons.data ?? []).filter((e) => e.day === weekday).map((e) => [e.period, e]));

  return (
    <div className="hr-day">
      {periods.data.map((p) => {
        const entry = today.get(p.id);
        const state = clock >= p.end_time ? "past" : clock >= p.start_time ? "now" : "";
        const time = <div className="t">{p.start_time.slice(0, 5)}</div>;
        if (p.is_break || !entry) {
          return (
            <div key={p.id} className={cn("hr-period break", !p.is_break && "!flex-[1_0_110px]", state === "past" && "past")}>
              {time}
              <div className="n">{p.is_break ? p.name : "Free"}</div>
            </div>
          );
        }
        return (
          <div key={p.id} className={cn("hr-period", `s-${entry.subject_group}`, state)}>
            {time}
            <div className="n">{entry.subject_name}</div>
            <div className="c">{detail(entry)}{entry.room && ` · ${entry.room}`}</div>
          </div>
        );
      })}
    </div>
  );
}
