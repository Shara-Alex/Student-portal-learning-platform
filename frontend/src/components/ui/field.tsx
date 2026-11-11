import type { ReactNode } from "react";

/** A label above a form control. (Homeroom stacks label over input on narrow layouts such as our pop-ups.) */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[14px] font-bold text-ink">{label}</span>
      {children}
    </label>
  );
}
