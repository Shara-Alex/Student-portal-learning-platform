import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

/**
 * Homeroom buttons.
 *   primary  the one green action a screen is for (Save, Add student)
 *   default  secondary actions (Cancel, Print)
 *   ghost    low-weight actions inside lists and cards (Edit)
 *   danger   destructive actions (Clear, Delete)
 *
 * busy: while saving. The label hides, a spinner shows, and the button cannot be pressed twice.
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "default" | "ghost" | "danger"; busy?: boolean };

export function Button({ className, variant = "primary", busy, disabled, ...props }: Props) {
  return (
    <button
      className={cn(
        "hr-btn justify-center whitespace-nowrap",
        variant === "primary" && "hr-btn-primary",
        variant === "ghost" && "hr-btn-ghost",
        variant === "danger" && "hr-btn-danger",
        className,
      )}
      // aria-busy draws the spinner (homeroom.css) and tells screen readers work is in progress.
      // disabled as well, so pressing Enter in a form cannot send it a second time.
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      {...props}
    />
  );
}
