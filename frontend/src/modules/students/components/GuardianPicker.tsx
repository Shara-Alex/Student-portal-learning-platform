import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useGuardians } from "../api";
import type { Guardian } from "../types";
import { GuardianForm } from "./GuardianForm";

/** Choose which guardians belong to a student: search existing ones, or create a new one on the spot. */
export function GuardianPicker({ selected, onChange }: { selected: Guardian[]; onChange: (g: Guardian[]) => void }) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  // Only hit the server once there is something worth searching for.
  const found = useGuardians(search, search.length >= 2);
  const options = (found.data?.results ?? []).filter((g) => !selected.some((s) => s.id === g.id));

  function add(g: Guardian) {
    onChange([...selected, g]);
    setSearch("");
  }

  return (
    <div className="space-y-2">
      <p className="text-[14px] font-bold text-ink">Guardians</p>
      <div className="flex flex-wrap gap-2">
        {selected.map((g) => (
          <span key={g.id} className="inline-flex items-center gap-1 rounded-full bg-board-soft py-1 pl-3 pr-1 text-sm font-bold text-board">
            {g.full_name} <span className="font-normal capitalize">({g.relationship})</span>
            <button type="button" aria-label={`Remove ${g.full_name}`} className="rounded-full p-0.5 hover:bg-line" onClick={() => onChange(selected.filter((s) => s.id !== g.id))}>
              <X size={14} />
            </button>
          </span>
        ))}
        {!selected.length && <span className="text-sm text-ink-muted">None linked yet.</span>}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Search guardians by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Button type="button" variant="default" className="shrink-0" onClick={() => setCreating(true)}><Plus size={16} /> New</Button>
      </div>
      {search.length >= 2 && (
        <div className="rounded-sm border border-line text-sm">
          {options.map((g) => (
            <button type="button" key={g.id} onClick={() => add(g)} className="flex w-full justify-between px-3 py-2 text-left hover:bg-sunken">
              <span>{g.full_name}</span>
              <span className="text-ink-muted">{g.phone}</span>
            </button>
          ))}
          {!options.length && <p className="px-3 py-2 text-ink-muted">{found.isFetching ? "Searching…" : "No match. Use New to add them."}</p>}
        </div>
      )}
      {creating && <GuardianForm guardian={null} onClose={() => setCreating(false)} onSaved={add} />}
    </div>
  );
}
