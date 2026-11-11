import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorText } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDeletePeriod, usePeriods, useSavePeriod } from "../api";
import type { Period } from "../types";

export function PeriodsTab({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<Period | null | undefined>(undefined);
  const periods = usePeriods();
  const remove = useDeletePeriod();
  const rows = periods.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Periods">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add period</Button>}
      </PageHeader>
      <p className="text-ink-muted">The school day, in order. The same periods apply Monday to Friday.</p>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Period</th>
              <th>Starts</th>
              <th>Ends</th>
              <th>Type</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="font-bold">{p.name}</td>
                <td className="font-mono">{p.start_time.slice(0, 5)}</td>
                <td className="font-mono">{p.end_time.slice(0, 5)}</td>
                <td><Badge tone={p.is_break ? "wait" : "good"}>{p.is_break ? "Break" : "Lesson"}</Badge></td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => setEditing(p)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${p.name}`} onClick={() => window.confirm(`Delete ${p.name}?`) && remove.mutate(p.id)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="!py-8 text-center text-ink-muted">{periods.isLoading ? "Loading…" : "No periods yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <PeriodForm period={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function PeriodForm({ period, onClose }: { period: Period | null; onClose: () => void }) {
  const save = useSavePeriod();
  const [name, setName] = useState(period?.name ?? "");
  const [start, setStart] = useState(period?.start_time.slice(0, 5) ?? "");
  const [end, setEnd] = useState(period?.end_time.slice(0, 5) ?? "");
  const [isBreak, setIsBreak] = useState(period?.is_break ?? false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: period?.id, data: { name, start_time: start, end_time: end, is_break: isBreak } }, { onSuccess: onClose });
  }

  return (
    <Modal title={period ? `Edit ${period.name}` : "Add period"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><Input required placeholder="Period 1" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><Input type="time" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Ends"><Input type="time" required value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isBreak} onChange={(e) => setIsBreak(e.target.checked)} />
          This is a break (no lessons)
        </label>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
