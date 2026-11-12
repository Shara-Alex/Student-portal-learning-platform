import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDeletePayment, useMoney, useRecordPayment } from "../api";
import { METHODS, STATUS, type Invoice, type PaymentMethod } from "../types";

/** One invoice laid out: charges, the payment plan, and money received. Read-only unless canEdit. */
export function InvoiceDetail({ invoice, canEdit }: { invoice: Invoice; canEdit: boolean }) {
  const money = useMoney();
  const removePayment = useDeletePayment();
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted"><span className="font-mono">{invoice.number}</span> · {invoice.term_name} · issued {invoice.issued}</p>
        <Badge tone={STATUS[invoice.status].tone}>{STATUS[invoice.status].label}</Badge>
      </div>

      <table className="hr-list">
        <thead><tr><th>Charge</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {invoice.lines.map((l) => <tr key={l.id}><td>{l.description}</td><td className="num">{money(l.amount)}</td></tr>)}
          <tr><td className="font-bold">Total</td><td className="num font-bold">{money(invoice.total)}</td></tr>
          <tr><td>Paid</td><td className="num">{money(invoice.paid)}</td></tr>
          <tr><td className="font-bold">Still owed</td><td className="num font-bold">{money(invoice.balance)}</td></tr>
        </tbody>
      </table>

      {invoice.schedule.length > 1 && (
        <div>
          <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Payment plan: {invoice.instalments} instalments</p>
          <div className="flex flex-wrap gap-2">
            {invoice.schedule.map((part) => (
              <span key={part.due} className="rounded-sm bg-sunken px-3 py-1 text-sm">
                <span className="font-mono">{money(part.amount)}</span> by {part.due}{part.due < today && " (passed)"}
              </span>
            ))}
          </div>
        </div>
      )}
      {invoice.due_now > 0 && <p className="rounded-sm bg-marker-soft px-3 py-2 text-sm text-marker">{money(invoice.due_now)} is overdue.</p>}

      <div>
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wider text-ink-muted">Payments received</p>
        {invoice.payments.length ? (
          <table className="hr-list">
            <tbody>
              {invoice.payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono">{p.date}</td>
                  <td>{METHODS.find((m) => m.value === p.method)?.label}{p.reference && ` · ${p.reference}`}</td>
                  <td className="num">{money(p.amount)}</td>
                  {canEdit && (
                    <td className="w-10 text-right">
                      <Button variant="ghost" aria-label="Delete this payment" onClick={() => window.confirm(`Delete this payment of ${money(p.amount)}? Only do this to correct a mistake.`) && removePayment.mutate(p.id)}><Trash2 size={16} /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="text-sm text-ink-muted">None yet.</p>}
      </div>

      {canEdit && invoice.balance > 0 && <PaymentForm invoice={invoice} />}
    </div>
  );
}

function PaymentForm({ invoice }: { invoice: Invoice }) {
  const record = useRecordPayment();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reference, setReference] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    record.mutate({ invoice: invoice.id, amount: Number(amount), date, method, reference }, { onSuccess: () => { setAmount(""); setReference(""); } });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-dashed border-line pt-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Record a payment</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount"><Input type="number" min="0.01" step="0.01" max={invoice.balance} required value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="How it was paid"><Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
        <Field label="Receipt or reference"><Input value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      </div>
      {record.isError && <p className="text-sm text-marker">{errorText(record.error)}</p>}
      <div className="flex justify-end"><Button disabled={record.isPending}>{record.isPending ? "Saving…" : "Record payment"}</Button></div>
    </form>
  );
}
