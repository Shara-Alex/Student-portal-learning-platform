import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useClasses } from "@/modules/students/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDeleteFee, useFees, useFeeSettings, useMoney, useSaveFee, useSaveFeeSettings } from "../api";
import type { Fee } from "../types";

/** What the school charges each term, per class or for everyone, plus the late payment fee. */
export function StructureTab() {
  const money = useMoney();
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<Fee | null | undefined>(undefined);
  const fees = useFees(term);
  const remove = useDeleteFee();
  const settings = useFeeSettings();
  const rows = fees.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Fee structure">
        <Button disabled={!term} onClick={() => setEditing(null)}><Plus size={16} /> Add fee</Button>
      </PageHeader>
      <TermPicker value={term} onChange={setTerm} />
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead><tr><th>Fee</th><th>Charged to</th><th className="num">Amount</th><th /></tr></thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id}>
                <td className="font-bold">{f.name}</td>
                <td>{f.school_class_name || "Every class"}</td>
                <td className="num">{money(f.amount)}</td>
                <td className="whitespace-nowrap text-right">
                  <Button variant="ghost" onClick={() => setEditing(f)}>Edit</Button>
                  <Button variant="ghost" aria-label={`Delete ${f.name}`} onClick={() => window.confirm(`Delete ${f.name}? Invoices already created keep their charges.`) && remove.mutate(f.id)}><Trash2 size={16} /></Button>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="!py-8 text-center text-ink-muted">{fees.isLoading ? "Loading…" : "No fees set for this term yet."}</td></tr>}
          </tbody>
        </table>
      </div>
      {settings.data && <LateFee key={settings.data.late_fee} current={settings.data.late_fee} />}
      {editing !== undefined && <FeeForm fee={editing} term={term} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function LateFee({ current }: { current: number }) {
  const save = useSaveFeeSettings();
  const [amount, setAmount] = useState(String(current));
  return (
    <Card>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(Number(amount)); }} className="flex flex-wrap items-end gap-4">
        <div className="w-52"><Field label="Late payment fee (0 = none)"><Input type="number" min="0" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field></div>
        <Button variant="default" disabled={save.isPending}>Save</Button>
        {save.isSuccess && <span className="text-sm text-board">Saved.</span>}
        {save.isError && <span className="text-sm text-marker">{errorText(save.error)}</span>}
        <p className="basis-full text-sm text-ink-muted">Added once to an overdue invoice when you press Apply late fees on the Invoices screen.</p>
      </form>
    </Card>
  );
}

function FeeForm({ fee, term, onClose }: { fee: Fee | null; term: string; onClose: () => void }) {
  const classes = useClasses();
  const save = useSaveFee();
  const [name, setName] = useState(fee?.name ?? "");
  const [amount, setAmount] = useState(fee ? String(fee.amount) : "");
  const [schoolClass, setSchoolClass] = useState(fee?.school_class ? String(fee.school_class) : "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: fee?.id, data: { term: fee?.term ?? Number(term), name, amount: Number(amount), school_class: schoolClass ? Number(schoolClass) : null } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={fee ? `Edit ${fee.name}` : "Add fee"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><Input required placeholder="Tuition" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount"><Input type="number" min="0.01" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Charged to">
            <Select value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)}>
              <option value="">Every class</option>
              {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        </div>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
