import type { ReactNode } from "react";

/**
 * A label and its form control.
 *   default  label above the input: for pop-ups, which are narrow
 *   side     label to the left (Homeroom's FormField, as in Odoo's forms): for forms that sit on a page.
 *            On a phone it stacks again, as the design asks.
 */
export function Field({ label, children, side = false }: { label: string; children: ReactNode; side?: boolean }) {
  const text = <span className="text-[14px] font-bold text-ink">{label}</span>;
  if (side) return <label className="hr-field max-sm:!grid-cols-1 max-sm:!gap-1">{text}{children}</label>;
  return <label className="block space-y-1">{text}{children}</label>;
}
