import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useSearchParams } from "react-router-dom";

export interface View<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

/**
 * Which view of a list is open (list, cards, board). It lives in the address as ?view=cards,
 * so a refresh or a shared link keeps it. The first view is the default.
 */
export function useView<T extends string>(views: View<T>[]): [T, (view: T) => void] {
  const [params, setParams] = useSearchParams();
  const current = views.find((v) => v.key === params.get("view"))?.key ?? views[0].key;
  function setView(view: T) {
    const next = new URLSearchParams(params);
    next.set("view", view);
    setParams(next, { replace: true }); // replace: switching view should not fill up the Back button
  }
  return [current, setView];
}

/** Homeroom's view switcher: the same records as a list for scanning, or cards / a board for stages and phones. */
export function ViewSwitcher<T extends string>({ views, value, onChange }: { views: View<T>[]; value: T; onChange: (view: T) => void }) {
  return (
    <div className="hr-status" role="group" aria-label="View">
      {views.map((v) => (
        <button
          key={v.key}
          type="button"
          aria-pressed={v.key === value}
          onClick={() => onChange(v.key)}
          className={cn(
            "flex cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-sm font-bold",
            v.key === value ? "bg-board text-on-board" : "text-ink-muted hover:text-ink",
          )}
        >
          <v.icon size={14} /> {v.label}
        </button>
      ))}
    </div>
  );
}
