import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { errorText } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useDeleteSubject, useSaveSubject, useSubjects } from "../api";
import type { Subject } from "../types";

export function SubjectsTab({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);
  const subjects = useSubjects();
  const remove = useDeleteSubject();
  const rows = subjects.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Subjects">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add subject</Button>}
      </PageHeader>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="font-bold">{s.name}</td>
                <td className="font-mono">{s.code}</td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => setEditing(s)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${s.name}`} onClick={() => window.confirm(`Delete ${s.name}?`) && remove.mutate(s.id)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={3} className="!py-8 text-center text-ink-muted">{subjects.isLoading ? "Loading…" : "No subjects yet."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <SubjectForm subject={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function SubjectForm({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const save = useSaveSubject();
  const [name, setName] = useState(subject?.name ?? "");
  const [code, setCode] = useState(subject?.code ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: subject?.id, data: { name, code } }, { onSuccess: onClose });
  }

  return (
    <Modal title={subject ? `Edit ${subject.name}` : "Add subject"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name"><Input required placeholder="Mathematics" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Short code"><Input required placeholder="MATH" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
