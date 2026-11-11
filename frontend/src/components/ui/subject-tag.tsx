import type { ReactNode } from "react";

/** A subject's name in its group colour. Maths is always pen blue, sciences always teal, and so on. */
export function SubjectTag({ group, children }: { group: string; children: ReactNode }) {
  return <span className={`hr-subj s-${group}`}>{children}</span>;
}
