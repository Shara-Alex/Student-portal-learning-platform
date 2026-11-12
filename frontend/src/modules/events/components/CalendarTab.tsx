import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { dateRange, useDeleteEvent, useEvents, useSaveEvent } from "../api";
import { EVENT_KINDS, type Audience, type EventKind, type SchoolEvent } from "../types";

export function CalendarTab({ canEdit }: { canEdit: boolean }) {
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<SchoolEvent | null | undefined>(undefined);
  const events = useEvents(!showPast);
  const rows = events.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Calendar">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add event</Button>}
      </PageHeader>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past events too
      </label>
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead><tr><th className="w-44">When</th><th>What</th><th>Type</th><th>For</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={cn(canEdit && "cursor-pointer")} onClick={canEdit ? () => setEditing(e) : undefined}>
                <td className="font-mono whitespace-nowrap">{dateRange(e.start_date, e.end_date)}</td>
                <td><p className="font-bold">{e.title}</p>{e.details && <p className="text-sm text-ink-muted">{e.details}</p>}</td>
                <td><Badge tone={e.kind === "exam" ? "wait" : e.kind === "holiday" ? "good" : "info"}>{EVENT_KINDS.find((k) => k.value === e.kind)?.label}</Badge></td>
                <td className="text-ink-muted">{e.audience === "staff" ? "Staff only" : "Everyone"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="!py-8 text-center text-ink-muted">{events.isLoading ? "Loading…" : "Nothing on the calendar."}</td></tr>}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <EventForm event={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function EventForm({ event, onClose }: { event: SchoolEvent | null; onClose: () => void }) {
  const save = useSaveEvent();
  const remove = useDeleteEvent();
  const [form, setForm] = useState({
    title: event?.title ?? "",
    details: event?.details ?? "",
    start_date: event?.start_date ?? "",
    end_date: event?.end_date ?? "",
    kind: (event?.kind ?? "event") as EventKind,
    audience: (event?.audience ?? "everyone") as Audience,
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const error = save.error ?? remove.error;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: event?.id, data: { ...form, end_date: form.end_date || null } }, { onSuccess: onClose });
  }

  return (
    <Modal title={event ? "Edit event" : "Add event"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Title"><Input required value={form.title} onChange={set("title")} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts"><Input type="date" required value={form.start_date} onChange={set("start_date")} /></Field>
          <Field label="Ends (if more than one day)"><Input type="date" value={form.end_date} onChange={set("end_date")} /></Field>
          <Field label="Type"><Select value={form.kind} onChange={set("kind")}>{EVENT_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</Select></Field>
          <Field label="Who sees it"><Select value={form.audience} onChange={set("audience")}><option value="everyone">Everyone</option><option value="staff">Staff only</option></Select></Field>
        </div>
        <Field label="Details"><Textarea value={form.details} onChange={set("details")} /></Field>
        {error && <p className="text-sm text-marker">{errorText(error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {event && <Button type="button" variant="danger" className="mr-auto" onClick={() => window.confirm(`Delete ${event.title}?`) && remove.mutate(event.id, { onSuccess: onClose })}>Delete</Button>}
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
