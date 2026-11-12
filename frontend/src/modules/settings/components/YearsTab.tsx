import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { errorText } from "@/lib/api";
import { useYears } from "@/modules/core/api";
import type { AcademicYear, Term } from "@/modules/core/types";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDeleteTerm, useDeleteYear, useMakeCurrent, useSaveTerm, useSaveYear } from "../api";

/** Which pop-up is open: a year (new or existing) or a term (new, inside a year, or existing). */
type Editing = { year: AcademicYear | null } | { term: Term | null; inYear: AcademicYear } | null;

/**
 * Academic years and the terms inside them. One year and one term are "current":
 * registers, marks and fees all default to them, so changing it is a deliberate act.
 */
export function YearsTab() {
  const years = useYears();
  const makeCurrent = useMakeCurrent();
  const removeYear = useDeleteYear();
  const removeTerm = useDeleteTerm();
  const [editing, setEditing] = useState<Editing>(null);
  const list = years.data?.results ?? [];
  const current = list.find((y) => y.is_current);
  const error = makeCurrent.error ?? removeYear.error ?? removeTerm.error;

  function setCurrent(kind: "years" | "terms", id: number, name: string) {
    if (window.confirm(`Make ${name} current? Registers, marks and fees will default to it for everyone.`)) makeCurrent.mutate({ kind, id });
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Years and terms">
        <Button onClick={() => setEditing({ year: null })}><Plus size={16} /> Add year</Button>
      </PageHeader>

      {/* Making a year current can leave it with no current term. The design's yellow means "waiting": nudge the admin. */}
      {years.data && !current && list.length > 0 && <p className="rounded-md bg-bus-soft px-4 py-3 text-bus-ink">No year is marked as current. Choose Make current on one.</p>}
      {current && !current.terms.some((t) => t.is_current) && (
        <p className="rounded-md bg-bus-soft px-4 py-3 text-bus-ink"><b>{current.name} has no current term.</b> Choose Make current on one of its terms, or the term-based screens have nothing to show.</p>
      )}
      {error && <p className="text-sm text-marker">{errorText(error)}</p>}
      {years.isLoading && <Skeleton />}
      {years.data && !list.length && <Card className="text-ink-muted">No academic years yet. Add the first one, then its terms.</Card>}

      {list.map((y) => (
        <Card key={y.id} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">{y.name}</h2>
            {y.is_current && <Badge tone="good">Current year</Badge>}
            <span className="font-mono text-sm text-ink-muted">{y.start_date} to {y.end_date}</span>
            <div className="ml-auto flex flex-wrap gap-1">
              {!y.is_current && <Button variant="ghost" onClick={() => setCurrent("years", y.id, y.name)}>Make current</Button>}
              <Button variant="ghost" onClick={() => setEditing({ term: null, inYear: y })}><Plus size={16} /> Add term</Button>
              <Button variant="ghost" onClick={() => setEditing({ year: y })}>Edit</Button>
              <Button variant="ghost" aria-label={`Delete ${y.name}`} onClick={() => window.confirm(`Delete the year ${y.name} and its terms?`) && removeYear.mutate(y.id)}><Trash2 size={16} /></Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="hr-list">
              <thead><tr><th>Term</th><th>Starts</th><th>Ends</th><th /><th /></tr></thead>
              <tbody>
                {y.terms.map((t) => (
                  <tr key={t.id}>
                    <td className="font-bold">{t.name}</td>
                    <td className="font-mono">{t.start_date}</td>
                    <td className="font-mono">{t.end_date}</td>
                    <td>{t.is_current && <Badge tone="good">Current term</Badge>}</td>
                    <td className="whitespace-nowrap text-right">
                      {!t.is_current && <Button variant="ghost" onClick={() => setCurrent("terms", t.id, `${t.name} ${y.name}`)}>Make current</Button>}
                      <Button variant="ghost" onClick={() => setEditing({ term: t, inYear: y })}>Edit</Button>
                      <Button variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => window.confirm(`Delete ${t.name} ${y.name}?`) && removeTerm.mutate(t.id)}><Trash2 size={16} /></Button>
                    </td>
                  </tr>
                ))}
                {!y.terms.length && <tr><td colSpan={5} className="!py-6 text-center text-ink-muted">No terms in this year yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {editing && "year" in editing && <YearForm year={editing.year} onClose={() => setEditing(null)} />}
      {editing && "term" in editing && <TermForm term={editing.term} year={editing.inYear} onClose={() => setEditing(null)} />}
    </div>
  );
}

function YearForm({ year, onClose }: { year: AcademicYear | null; onClose: () => void }) {
  const save = useSaveYear();
  const [name, setName] = useState(year?.name ?? "");
  const [start, setStart] = useState(year?.start_date ?? "");
  const [end, setEnd] = useState(year?.end_date ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: year?.id, data: { name, start_date: start, end_date: end } }, { onSuccess: onClose });
  }

  return (
    <Modal title={year ? `Edit ${year.name}` : "Add year"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><Input required placeholder="2027" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First day"><Input type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Last day"><Input type="date" required value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function TermForm({ term, year, onClose }: { term: Term | null; year: AcademicYear; onClose: () => void }) {
  const save = useSaveTerm();
  const [name, setName] = useState(term?.name ?? "");
  const [start, setStart] = useState(term?.start_date ?? "");
  const [end, setEnd] = useState(term?.end_date ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: term?.id, data: { year: year.id, name, start_date: start, end_date: end } }, { onSuccess: onClose });
  }

  return (
    <Modal title={term ? `Edit ${term.name} ${year.name}` : `Add a term to ${year.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><Input required placeholder="Term 1" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          {/* min and max keep the date picker inside the year; the server checks the same rule again. */}
          <Field label="First day"><Input type="date" required min={year.start_date} max={year.end_date} value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Last day"><Input type="date" required min={year.start_date} max={year.end_date} value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <p className="text-sm text-ink-muted">Terms must sit inside the year ({year.start_date} to {year.end_date}) and must not overlap each other.</p>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
