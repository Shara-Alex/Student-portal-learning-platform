import { PageHeader } from "@/components/ui/page-header";
import { usePeriods, useTimetable } from "../api";
import { TimetableGrid } from "./TimetableGrid";

/** A teacher's own week. Today's column is highlighted so it doubles as the day plan. */
export function MyTimetableTab() {
  const periods = usePeriods();
  const lessons = useTimetable({ teacher: "me" });
  const today = new Date().getDay(); // 0 = Sunday, 1 = Monday ... matches our day numbers for Mon to Fri
  const todays = (lessons.data ?? []).filter((e) => e.day === today).length;

  return (
    <div className="space-y-4">
      <PageHeader title="My timetable" />
      <p className="text-ink-muted">
        {today >= 1 && today <= 5 ? `You have ${todays} lesson(s) today.` : "No lessons today."}
      </p>
      <TimetableGrid
        periods={periods.data ?? []}
        entries={lessons.data ?? []}
        detail={(e) => e.school_class_name}
        highlightDay={today}
      />
    </div>
  );
}
