import { cn } from "@/lib/utils";

/**
 * An on/off switch for a setting that takes effect at once (no Save button).
 * It is a <button> with role="switch", so screen readers say "on" or "off" and Space flips it.
 */
export function Switch({ checked, onChange, label, disabled }: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: string; // read out by screen readers, since the switch itself has no words
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-[var(--duration-fast)] disabled:cursor-wait disabled:opacity-60",
        checked ? "bg-board" : "bg-line-strong",
      )}
    >
      {/* The knob. translate-x moves it to the right when on; the transition animates the move. */}
      <span className={cn("absolute top-0.5 left-0.5 size-5 rounded-full bg-raised shadow-card transition-transform duration-[var(--duration-fast)]", checked && "translate-x-5")} />
    </button>
  );
}
