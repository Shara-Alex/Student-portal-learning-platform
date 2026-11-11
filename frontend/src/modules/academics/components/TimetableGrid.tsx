import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { DAYS, type Period, type TimetableEntry } from "../types";

interface Props {
  periods: Period[];
  entries: TimetableEntry[];
  /** The small second line in each cell: the teacher (class view) or the class (teacher view). */
  detail: (entry: TimetableEntry) => string;
  /** When given, lesson cells become clickable (admin editing). */
  onCell?: (day: number, period: Period, entry?: TimetableEntry) => void;
  /** Weekday number to highlight, e.g. today. */
  highlightDay?: number;
}

const hhmm = (time: string) => time.slice(0, 5);

/** The weekly grid: periods down the side, Monday to Friday across the top. */
export function TimetableGrid({ periods, entries, detail, onCell, highlightDay }: Props) {
  // Index lessons by "day-period" so each cell is one quick lookup instead of a search.
  const bySlot = new Map(entries.map((e) => [`${e.day}-${e.period}`, e]));

  if (!periods.length) {
    return <Card className="text-ink-muted">No periods set up yet. Add the school day under Periods first.</Card>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="hr-list table-fixed">
        <thead>
          <tr>
            <th className="w-32">Period</th>
            {/* Bus yellow marks "today", as it does on every Homeroom calendar. */}
            {DAYS.map((d) => (
              <th key={d.value} className={cn(d.value === highlightDay && "!bg-bus-soft !text-bus-ink")}>{d.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.id} className="[&:hover>td]:!bg-transparent">
              <td className="align-top">
                <p className="font-bold">{p.name}</p>
                <p className="font-mono text-sm text-ink-muted">{hhmm(p.start_time)}–{hhmm(p.end_time)}</p>
              </td>
              {p.is_break ? (
                <td colSpan={DAYS.length} className="!bg-sunken text-center text-xs font-extrabold uppercase tracking-wider text-ink-muted">{p.name}</td>
              ) : (
                DAYS.map((d) => {
                  const entry = bySlot.get(`${d.value}-${p.id}`);
                  return (
                    <td
                      key={d.value}
                      onClick={onCell ? () => onCell(d.value, p, entry) : undefined}
                      className={cn(
                        "h-16 border-l border-line !p-1 align-top",
                        d.value === highlightDay && "!bg-bus-soft",
                        onCell && "cursor-pointer hover:!bg-sunken",
                      )}
                    >
                      {entry ? (
                        // s-<group> sets --s and --s-soft: every subject keeps its own colour everywhere.
                        <div className={`s-${entry.subject_group} h-full rounded-sm bg-(--s-soft) px-2 py-1`}>
                          <p className="truncate font-bold text-(--s)">{entry.subject_name}</p>
                          <p className="truncate text-sm text-ink-muted">{detail(entry)}{entry.room && ` · ${entry.room}`}</p>
                        </div>
                      ) : (
                        onCell && <span className="px-2 text-sm text-ink-muted/60">+ add</span>
                      )}
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
