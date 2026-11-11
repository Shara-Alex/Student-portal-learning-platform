import type { ReactNode } from "react";

/** The top of every screen: its title on the left, its one main (green) action on the right. */
export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-4 print:hidden">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      {children}
    </div>
  );
}
