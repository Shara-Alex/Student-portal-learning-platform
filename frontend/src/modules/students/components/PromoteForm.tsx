import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useYears } from "@/modules/core/api";
import { useState, type FormEvent } from "react";
import { useClasses, usePromote, useStudents } from "../api";
import type { SchoolClass } from "../types";

const LEAVING = "leaving";

/** Year-end promotion: move the students of one class into a class for another academic year. */
export function PromoteForm({ fromClass, onClose }: { fromClass: SchoolClass; onClose: () => void }) {
  const years = useYears();
  const classes = useClasses();
  const students = useStudents({ school_class: String(fromClass.id), status: "active", page_size: 500 });
  const promote = usePromote();

  const [toYear, setToYear] = useState("");
  const [toClass, setToClass] = useState("");
  // Everyone moves up unless unticked, so we store the ids to LEAVE BEHIND (e.g. repeating the year).
  const [staying, setStaying] = useState<number[]>([]);

  const otherYears = (years.data?.results ?? []).filter((y) => !y.is_current);
  const rows = students.data?.results ?? [];
  const moving = rows.filter((s) => !staying.includes(s.id));

  const toggle = (id: number) =>
    setStaying(staying.includes(id) ? staying.filter((x) => x !== id) : [...staying, id]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    promote.mutate(
      {
        from_class: fromClass.id,
        to_year: Number(toYear),
        to_class: toClass === LEAVING ? null : Number(toClass),
        students: moving.map((s) => s.id),
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={`Promote ${fromClass.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Into academic year">
            <Select required value={toYear} onChange={(e) => setToYear(e.target.value)}>
              <option value="">Choose…</option>
              {otherYears.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}
            </Select>
          </Field>
          <Field label="New class">
            <Select required value={toClass} onChange={(e) => setToClass(e.target.value)}>
              <option value="">Choose…</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value={LEAVING}>Leaving school (mark as graduated)</option>
            </Select>
          </Field>
        </div>
        {!years.isLoading && !otherYears.length && (
          <p className="text-sm text-bus-ink">Create the next academic year first (in /admin), then come back.</p>
        )}

        <div>
          <p className="mb-1 text-[14px] font-bold text-ink">Students ({moving.length} of {rows.length} moving). Untick anyone staying behind.</p>
          <div className="max-h-56 overflow-y-auto rounded-sm border border-line">
            {rows.map((s) => (
              <label key={s.id} className="flex cursor-pointer items-center gap-2 border-b border-line px-3 py-2 text-sm last:border-0 hover:bg-sunken">
                <input type="checkbox" checked={!staying.includes(s.id)} onChange={() => toggle(s.id)} />
                <span className="font-mono text-xs text-ink-muted">{s.admission_number}</span>
                {s.full_name}
              </label>
            ))}
          </div>
        </div>

        {promote.isError && <p className="text-sm text-marker">{errorText(promote.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={promote.isPending || !moving.length}>{promote.isPending ? "Working…" : `Promote ${moving.length}`}</Button>
        </div>
      </form>
    </Modal>
  );
}
