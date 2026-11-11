import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

/** A white sheet on the paper background. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-md border border-line bg-raised p-4 shadow-card", className)} {...props} />;
}
