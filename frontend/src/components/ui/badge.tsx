import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * A one- or two-word state. The colour means the same thing everywhere:
 *   good = present / paid / active     wait = late / pending
 *   bad  = absent / overdue            info = draft / new      neutral = archived / inactive
 */
export type Tone = "good" | "wait" | "bad" | "info" | "neutral";

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cn("hr-badge", tone !== "neutral" && `hr-badge-${tone}`)}>{children}</span>;
}
