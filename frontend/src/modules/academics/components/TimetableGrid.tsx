import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Fragment } from "react";
import { DAYS, type Period, type TimetableEntry } from "../types";

interface Props {
  periods: Period[];
  entries: TimetableEntry[];
  /** The small second line in each slot: the teacher (class view) or the class (teacher view). */
  detail: (entry: TimetableEntry) => string;
  /** When given, slots become clickable (admin editing). */
  onCell?: (day: number, period: Period, entry?: TimetableEntry) => void;
  /** Weekday number to highlight, e.g. today. */
  highlightDay?: number;
}

const hhmm = (time: string) => time.slice(0, 5);

/**
 * Homeroom's Timetable: days across, periods down, each lesson a block in its subject's colour.
 * Free periods are dashed outlines so the grid keeps its shape. The same grid shows a class's
 * week or a teacher's week; only the second line of each slot changes.
 */
export function TimetableGrid({ periods, entries, detail, onCell, highlightDay }: Props) {
  // Index lessons by "day-period" so each slot is one quick lookup instead of a search.
  const bySlot = new Map(entries.map((e) => [`${e.day}-${e.period}`, e]));

  if (!periods.length) {
    return <Card className="text-ink-muted">No periods set up yet. Add the school day under Periods first.</Card>;
  }

  return (
    <div className="overflow-x-auto">
      {/* The design's first column is 56px; ours is wider because it also carries the period's name. */}
      <div className="hr-tt min-w-[680px] !grid-cols-[92px_repeat(5,1fr)]">
        <div />
        {DAYS.map((d) => <div key={d.value} className={cn("h", d.value === highlightDay && "today")}>{d.label}</div>)}
        {periods.map((p) => (
          <Fragment key={p.id}>
            <div className="tm">
              <span className="block font-sans text-[13px] font-bold text-ink">{p.name}</span>
              {hhmm(p.start_time)}–{hhmm(p.end_time)}
            </div>
            {p.is_break ? (
              <div className="free col-span-5 grid place-items-center text-xs font-extrabold uppercase tracking-wider text-ink-muted">{p.name}</div>
            ) : (
              DAYS.map((d) => {
                const entry = bySlot.get(`${d.value}-${p.id}`);
                const click = onCell ? () => onCell(d.value, p, entry) : undefined;
                // A <button> when it can be clicked (keyboard users can reach it), a plain box when it cannot.
                const Box = onCell ? "button" : "div";
                return entry ? (
                  // s-<group> sets --s and --s-soft: every subject keeps its own colour everywhere.
                  <Box key={d.value} type={onCell ? "button" : undefined} onClick={click} className={cn("slot text-left", `s-${entry.subject_group}`, onCell && "cursor-pointer hover:brightness-95")}>
                    <b className="truncate">{entry.subject_name}</b>
                    <span className="block truncate">{detail(entry)}{entry.room && ` · ${entry.room}`}</span>
                  </Box>
                ) : (
                  <Box key={d.value} type={onCell ? "button" : undefined} onClick={click} aria-label={onCell ? `Add a lesson: ${d.label}, ${p.name}` : undefined} className={cn("free", onCell && "cursor-pointer text-ink-muted/60 hover:bg-sunken")}>
                    {onCell && "+"}
                  </Box>
                );
              })
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
