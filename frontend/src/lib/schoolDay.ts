/**
 * The school clock: what time it is at the school, and which period is on right now.
 * Used by the status footer (and, next, the "Right now" card in the rail).
 */
import { usePeriods, useTimetable, type Filters } from "@/modules/academics/api";
import { useEffect, useState } from "react";

/**
 * The school's time zone, e.g. "Africa/Harare".
 * The design wants the school's clock, not the phone's, so a phone set to the wrong zone
 * still shows the right period. The backend has been asked to send the zone with /api/core/school/.
 * Until it does, this is undefined, which means "use the device's own zone".
 */
export function useSchoolTimeZone(): string | undefined {
  return undefined;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * The weekday and the time of day in a time zone.
 * weekday: 0 = Sunday, 1 = Monday ... 5 = Friday (the same numbers the timetable uses).
 * time: "09:05:30", written the same way the API writes period times, so the two compare as text.
 */
export function nowAt(timeZone?: string, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { weekday: WEEKDAYS.indexOf(part("weekday")), time: `${part("hour")}:${part("minute")}:${part("second")}` };
}

/** "09:30:00" -> seconds since midnight. */
const seconds = (time: string) => {
  const [h, m, s = 0] = time.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

/**
 * The period on right now, and the lesson in it for whoever `filters` names
 * ({teacher: "me"} or {school_class: "3"}). Pass null to skip the lesson and get only the period.
 * Returns null on weekends, before the first period and after the last.
 * It looks again every minute, so "12 min left" counts down by itself.
 */
export function useCurrentPeriod(filters: Filters | null, timeZone?: string) {
  const periods = usePeriods();
  const lessons = useTimetable(filters ?? {}, filters !== null);
  const [, setTick] = useState(0);
  useEffect(() => {
    // Changing state makes React draw this component again, which re-reads the clock.
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id); // stop the timer when the component goes away
  }, []);

  const { weekday, time } = nowAt(timeZone);
  if (weekday < 1 || weekday > 5 || !periods.data) return null;
  const period = periods.data.find((p) => time >= p.start_time && time < p.end_time);
  if (!period) return null;
  const lesson = lessons.data?.find((e) => e.day === weekday && e.period === period.id);
  const minutesLeft = Math.ceil((seconds(period.end_time) - seconds(time)) / 60);
  return { period, lesson, minutesLeft };
}
