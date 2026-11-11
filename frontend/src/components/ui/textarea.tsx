import { cn } from "@/lib/utils";
import type { TextareaHTMLAttributes } from "react";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  // hr-input is a fixed 36px high; a text area needs to grow, so height and padding are overridden.
  return <textarea rows={2} className={cn("hr-input h-auto py-2", className)} {...props} />;
}
