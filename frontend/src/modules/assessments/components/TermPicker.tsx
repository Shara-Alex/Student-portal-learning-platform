import { Select } from "@/components/ui/select";
import { useTerms } from "@/modules/core/api";
import { useEffect } from "react";

/**
 * A dropdown of terms. Until the user picks one it selects the current term by itself.
 * `year` (optional) limits the list to one academic year.
 */
export function TermPicker({ value, onChange, year }: { value: string; onChange: (term: string) => void; year?: number }) {
  const terms = useTerms();
  const options = (terms.data?.results ?? []).filter((t) => year === undefined || t.year === year);
  const fallback = options.find((t) => t.is_current) ?? options[0];
  const valid = options.some((t) => String(t.id) === value);

  // If nothing valid is chosen (first load, or the year changed), fall back to the current term.
  useEffect(() => {
    if (!valid && fallback) onChange(String(fallback.id));
  }, [valid, fallback, onChange]);

  return (
    <Select className="w-44" aria-label="Term" value={valid ? value : ""} onChange={(e) => onChange(e.target.value)}>
      {!options.length && <option value="">No terms yet</option>}
      {options.map((t) => <option key={t.id} value={t.id}>{t.name} {t.year_name}</option>)}
    </Select>
  );
}
