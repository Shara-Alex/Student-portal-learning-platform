import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

/**
 * Homeroom buttons.
 *   primary  the one green action a screen is for (Save, Add student)
 *   default  secondary actions (Cancel, Print)
 *   ghost    low-weight actions inside lists and cards (Edit)
 *   danger   destructive actions (Clear, Delete)
 */
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "default" | "ghost" | "danger" };

export function Button({ className, variant = "primary", ...props }: Props) {
  return (
    <button
      className={cn(
        "hr-btn justify-center whitespace-nowrap",
        variant === "primary" && "hr-btn-primary",
        variant === "ghost" && "hr-btn-ghost",
        variant === "danger" && "hr-btn-danger",
        className,
      )}
      {...props}
    />
  );
}
