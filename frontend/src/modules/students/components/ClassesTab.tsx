import { EmptyRow } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useTeachers } from "@/modules/core/api";
import { ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useClasses, useDeleteClass, useSaveClass } from "../api";
import type { SchoolClass } from "../types";
import { PromoteForm } from "./PromoteForm";

export function ClassesTab({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<SchoolClass | null | undefined>(undefined);
  const [promoting, setPromoting] = useState<SchoolClass | null>(null);
  const classes = useClasses();
  const remove = useDeleteClass();
  const rows = classes.data ?? [];

  function onDelete(c: SchoolClass) {
    if (window.confirm(`Delete class ${c.name}?`)) remove.mutate(c.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Classes">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add class</Button>}
      </PageHeader>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Class</th>
              <th>Level</th>
              <th>Class teacher</th>
              <th className="num">Students (this year)</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td className="font-bold">{c.name}</td>
                <td className="font-mono">{c.level}</td>
                <td>{c.class_teacher_name || "—"}</td>
                <td className="num">{c.student_count}</td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" disabled={!c.student_count} onClick={() => setPromoting(c)}><ArrowUpRight size={16} /> Promote</Button>
                    <Button variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => onDelete(c)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <EmptyRow query={classes} colSpan={5}>No classes yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <ClassForm schoolClass={editing} onClose={() => setEditing(undefined)} />}
      {promoting && <PromoteForm fromClass={promoting} onClose={() => setPromoting(null)} />}
    </div>
  );
}

function ClassForm({ schoolClass, onClose }: { schoolClass: SchoolClass | null; onClose: () => void }) {
  const teachers = useTeachers();
  const save = useSaveClass();
  const [name, setName] = useState(schoolClass?.name ?? "");
  const [level, setLevel] = useState(String(schoolClass?.level ?? 1));
  const [teacher, setTeacher] = useState(schoolClass?.class_teacher ? String(schoolClass.class_teacher) : "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: schoolClass?.id, data: { name, level: Number(level), class_teacher: teacher ? Number(teacher) : null } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={schoolClass ? `Edit ${schoolClass.name}` : "Add class"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Class name"><Input required placeholder="Form 1A" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Level (grade / form number)"><Input type="number" min={0} required value={level} onChange={(e) => setLevel(e.target.value)} /></Field>
        <Field label="Class teacher">
          <Select value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">None</option>
            {teachers.data?.results.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.username}</option>)}
          </Select>
        </Field>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
