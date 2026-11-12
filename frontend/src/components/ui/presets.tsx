import { cn } from "@/lib/utils";

/**
 * Homeroom's preset filters: two or three ready-made answers to "show me..." as chips
 * ("My class", "Overdue"). Most school users never build a filter, so the common ones are one tap.
 */
export function Presets({ options, value, onChange, label }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  label: string; // what the chips choose, for screen readers
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={o.key === value}
          onClick={() => onChange(o.key)}
          className={cn(
            "cursor-pointer rounded-full border px-3 py-1 text-sm font-bold",
            o.key === value ? "border-board bg-board-soft text-board" : "border-line text-ink-muted hover:bg-sunken hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
