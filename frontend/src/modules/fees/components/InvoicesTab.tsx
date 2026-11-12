import { EmptyRow } from "@/components/ui/skeleton";
import { TermPicker } from "@/components/TermPicker";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Presets } from "@/components/ui/presets";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useClasses } from "@/modules/students/api";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApplyLateFees, useBillClass, useDeleteInvoice, useFeeSummary, useInvoices, useMoney } from "../api";
import { STATUS } from "../types";
import { InvoiceDetail } from "./InvoiceDetail";

export function InvoicesTab() {
  const money = useMoney();
  const classes = useClasses();
  const [term, setTerm] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [status, setStatus] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [billing, setBilling] = useState(false);
  const invoices = useInvoices({ term, school_class: schoolClass, status });
  const summary = useFeeSummary(term);
  const lateFees = useApplyLateFees();
  const remove = useDeleteInvoice();
  const rows = invoices.data ?? [];
  // Look the open invoice up in the fresh list each time, so it updates the moment a payment is recorded.
  const open = rows.find((i) => i.id === openId);

  return (
    <div className="space-y-4">
      <PageHeader title="Invoices">
        <Button onClick={() => setBilling(true)}><Plus size={16} /> Bill a class</Button>
      </PageHeader>

      {summary.data && (
        <div className="hr-stats !grid-cols-2 !p-0 sm:!grid-cols-4">
          <div className="hr-stat"><div className="k">Billed</div><div className="v">{money(summary.data.billed)}</div></div>
          <div className="hr-stat"><div className="k">Collected</div><div className="v">{money(summary.data.collected)}</div></div>
          <div className="hr-stat"><div className="k">Still owed</div><div className="v">{money(summary.data.outstanding)}</div></div>
          <div className="hr-stat"><div className="k">Overdue invoices</div><div className={`v ${summary.data.overdue ? "down" : ""}`}>{summary.data.overdue}</div></div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <TermPicker value={term} onChange={setTerm} />
        <Select className="w-44" aria-label="Class" value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)}>
          <option value="">All classes</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        {/* Homeroom's preset filters: "Overdue" is one tap, not a dropdown. */}
        <Presets label="Status" value={status} onChange={setStatus} options={[{ key: "", label: "All" }, ...Object.entries(STATUS).map(([key, s]) => ({ key, label: s.label }))]} />
        <Button variant="default" className="ml-auto" disabled={lateFees.isPending} onClick={() => window.confirm("Add the late fee to every overdue invoice that has not had one yet?") && lateFees.mutate(undefined)}>
          Apply late fees
        </Button>
      </div>
      {lateFees.isSuccess && <p className="text-sm text-board">Late fee added to {lateFees.data.applied} invoice(s).</p>}
      {lateFees.isError && <p className="text-sm text-marker">{errorText(lateFees.error)}</p>}

      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr><th>Invoice</th><th>Student</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Still owed</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((i) => (
              <tr key={i.id} className="cursor-pointer" onClick={() => setOpenId(i.id)}>
                <td className="font-mono">{i.number}</td>
                <td><div className="who"><Avatar name={i.student_name} />{i.student_name}</div></td>
                <td className="num">{money(i.total)}</td>
                <td className="num">{money(i.paid)}</td>
                <td className="num">{money(i.balance)}</td>
                <td><Badge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Badge></td>
              </tr>
            ))}
            {!rows.length && <EmptyRow query={invoices} colSpan={6}>No invoices here yet. Use Bill a class to create them.</EmptyRow>}
          </tbody>
        </table>
      </div>

      {open && (
        <Modal title={open.student_name} onClose={() => setOpenId(null)}>
          <InvoiceDetail invoice={open} canEdit />
          {remove.isError && <p className="mt-2 text-sm text-marker">{errorText(remove.error)}</p>}
          <div className="mt-4 flex justify-between border-t border-line pt-3">
            <Button variant="danger" disabled={open.payments.length > 0} title={open.payments.length ? "Delete its payments first" : ""} onClick={() => window.confirm(`Delete invoice ${open.number}?`) && remove.mutate(open.id, { onSuccess: () => setOpenId(null) })}>Delete invoice</Button>
            <Button variant="default" onClick={() => setOpenId(null)}>Close</Button>
          </div>
        </Modal>
      )}
      {billing && <BillForm term={term} onClose={() => setBilling(false)} />}
    </div>
  );
}

function BillForm({ term, onClose }: { term: string; onClose: () => void }) {
  const classes = useClasses();
  const bill = useBillClass();
  const [schoolClass, setSchoolClass] = useState("");
  const [billTerm, setBillTerm] = useState(term);
  const [due, setDue] = useState("");
  const [instalments, setInstalments] = useState("1");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    bill.mutate({ school_class: Number(schoolClass), term: Number(billTerm), due_date: due, instalments: Number(instalments) });
  }

  return (
    <Modal title="Bill a class" onClose={onClose}>
      {bill.isSuccess ? (
        <div className="space-y-3">
          <p>{bill.data.created} invoice(s) created.{bill.data.skipped > 0 && ` ${bill.data.skipped} student(s) already had one for this term and were left alone.`}</p>
          <div className="flex justify-end"><Button onClick={onClose}>Done</Button></div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-ink-muted">Creates one invoice for every active student in the class, using the fee structure for that term.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Class">
              <Select required value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)}>
                <option value="">Choose…</option>
                {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Term"><TermPicker value={billTerm} onChange={setBillTerm} /></Field>
            <Field label="First payment due"><Input type="date" required value={due} onChange={(e) => setDue(e.target.value)} /></Field>
            <Field label="Pay in">
              <Select value={instalments} onChange={(e) => setInstalments(e.target.value)}>
                <option value="1">One payment</option>
                {[2, 3, 4].map((n) => <option key={n} value={n}>{n} monthly instalments</option>)}
              </Select>
            </Field>
          </div>
          {bill.isError && <p className="text-sm text-marker">{errorText(bill.error)}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
            <Button busy={bill.isPending}>Create invoices</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
