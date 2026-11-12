import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useClasses } from "@/modules/students/api";
import { Download, ExternalLink } from "lucide-react";
import { useState, type FormEvent } from "react";
import { downloadDocument, useApplications, useEnrol, useUpdateApplication } from "../api";
import { STAGES, type Application, type Stage } from "../types";

const tone: Record<Stage, Tone> = { applied: "info", interview: "wait", offered: "wait", enrolled: "good", declined: "bad" };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** A kanban board: one column per stage, one card per applicant (Homeroom's KanbanCard). */
export function ApplicationsTab() {
  const applications = useApplications();
  const [openId, setOpenId] = useState<number | null>(null);
  const [showDeclined, setShowDeclined] = useState(false);
  const rows = applications.data ?? [];
  const open = rows.find((a) => a.id === openId);
  const columns = showDeclined ? [...STAGES, { value: "declined" as Stage, label: "Declined" }] : STAGES;

  return (
    <div className="space-y-4">
      <PageHeader title="Applications">
        <a href="/apply" target="_blank" rel="noreferrer" className="hr-btn"><ExternalLink size={16} /> Open the public form</a>
      </PageHeader>
      <p className="text-ink-muted">Families apply at <span className="font-mono text-ink">{window.location.origin}/apply</span>. No login is needed; share that link.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showDeclined} onChange={(e) => setShowDeclined(e.target.checked)} /> Show declined applications
      </label>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(200px, 1fr))` }}>
        {columns.map((column) => {
          const cards = rows.filter((a) => a.status === column.value);
          return (
            <div key={column.value} className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{column.label} <span className="font-mono">{cards.length}</span></p>
              {cards.map((a) => (
                <article key={a.id} className="hr-card cursor-pointer hover:shadow-lift" onClick={() => setOpenId(a.id)}>
                  <header>
                    <Avatar name={a.full_name} />
                    <div><h4>{a.full_name}</h4><div className="meta">{a.applying_for} · {a.guardian_name}</div></div>
                  </header>
                  <footer><Badge tone={tone[a.status]}>{column.label}</Badge><span className="mark text-sm">{day(a.created_at)}</span></footer>
                </article>
              ))}
              {!cards.length && <div className="rounded-md border border-dashed border-line p-4 text-center text-sm text-ink-muted">None</div>}
            </div>
          );
        })}
      </div>
      {open && <ApplicationDetail application={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ApplicationDetail({ application: a, onClose }: { application: Application; onClose: () => void }) {
  const update = useUpdateApplication();
  const [notes, setNotes] = useState(a.notes);
  const [enrolling, setEnrolling] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const position = STAGES.findIndex((s) => s.value === a.status); // -1 when declined
  const next = position >= 0 && position < 2 ? STAGES[position + 1] : null; // applied -> interview -> offered
  const closed = a.status === "enrolled" || a.status === "declined";

  const row = (label: string, value: string) => value && (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-1"><span className="text-[14px] font-bold">{label}</span><span className="whitespace-pre-line">{value}</span></div>
  );

  return (
    <Modal title={a.full_name} onClose={onClose}>
      <div className="space-y-4">
        {/* Homeroom's Statusbar: done steps ticked, the current one filled. */}
        {a.status === "declined" ? <Badge tone="bad">Declined</Badge> : (
          <div className="hr-status">
            {STAGES.map((s, i) => <span key={s.value} className={cn(i < position && "done", i === position && "current")}>{s.label}</span>)}
          </div>
        )}

        <div>
          {row("Applying for", a.applying_for)}
          {row("Born", a.date_of_birth)}
          {row("Gender", a.gender === "M" ? "Male" : "Female")}
          {row("Previous school", a.previous_school)}
          {row("Reason for moving", a.reason_for_transfer)}
          {row("Medical notes", a.medical_notes)}
          <div className="my-2 border-t border-dashed border-line" />
          {row("Guardian", `${a.guardian_name} (${a.guardian_relationship})`)}
          {row("Phone", a.guardian_phone)}
          {row("Email", a.guardian_email)}
          {a.has_document && (
            <Button variant="default" className="mt-2" onClick={() => downloadDocument(a.id).catch((e) => setDownloadError(errorText(e)))}><Download size={16} /> Supporting document</Button>
          )}
          {downloadError && <p className="text-sm text-marker">{downloadError}</p>}
        </div>

        <Field label="Staff notes (the family never sees these)">
          <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== a.notes && update.mutate({ id: a.id, notes })} />
        </Field>
        {update.isError && <p className="text-sm text-marker">{errorText(update.error)}</p>}

        {enrolling ? <EnrolForm application={a} onDone={onClose} onCancel={() => setEnrolling(false)} /> : (
          <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-3">
            {!closed && <Button variant="danger" className="mr-auto" onClick={() => window.confirm(`Decline ${a.full_name}'s application?`) && update.mutate({ id: a.id, status: "declined" })}>Decline</Button>}
            {a.status === "declined" && <Button variant="default" className="mr-auto" onClick={() => update.mutate({ id: a.id, status: "applied" })}>Reopen</Button>}
            <Button variant="default" onClick={onClose}>Close</Button>
            {next && <Button onClick={() => update.mutate({ id: a.id, status: next.value })}>Move to {next.label}</Button>}
            {a.status === "offered" && <Button onClick={() => setEnrolling(true)}>Enrol as a student</Button>}
          </div>
        )}
        {a.status === "enrolled" && <Card className="bg-board-soft text-board">Enrolled. Their record is now under Students.</Card>}
      </div>
    </Modal>
  );
}

function EnrolForm({ application, onDone, onCancel }: { application: Application; onDone: () => void; onCancel: () => void }) {
  const classes = useClasses();
  const enrol = useEnrol();
  const [number, setNumber] = useState("");
  const [schoolClass, setSchoolClass] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    enrol.mutate({ id: application.id, admission_number: number, school_class: schoolClass ? Number(schoolClass) : null }, { onSuccess: onDone });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-line pt-3">
      <p className="text-sm text-ink-muted">This creates the student and their guardian from the application.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Admission number"><Input required autoFocus value={number} onChange={(e) => setNumber(e.target.value)} /></Field>
        <Field label="Class (current year)">
          <Select value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)}>
            <option value="">Not placed yet</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      {enrol.isError && <p className="text-sm text-marker">{errorText(enrol.error)}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="default" onClick={onCancel}>Back</Button>
        <Button busy={enrol.isPending}>Enrol</Button>
      </div>
    </form>
  );
}
