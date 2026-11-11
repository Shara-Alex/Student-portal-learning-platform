import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useTeachers } from "@/modules/core/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useClasses, useDeleteClass, useSaveClass } from "../api";
import type { SchoolClass } from "../types";

export function ClassesTab({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<SchoolClass | null | undefined>(undefined);
  const classes = useClasses();
  const remove = useDeleteClass();
  const rows = classes.data ?? [];

  function onDelete(c: SchoolClass) {
    if (window.confirm(`Delete class ${c.name}?`)) remove.mutate(c.id);
  }

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setEditing(null)}><Plus size={16} /> Add class</Button>
        </div>
      )}
      {remove.isError && <p className="text-sm text-red-600">{errorText(remove.error)}</p>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Class teacher</th>
              <th className="px-4 py-3">Students (this year)</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.level}</td>
                <td className="px-4 py-3">{c.class_teacher_name || "—"}</td>
                <td className="px-4 py-3">{c.student_count}</td>
                {canEdit && (
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => setEditing(c)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => onDelete(c)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{classes.isLoading ? "Loading…" : "No classes yet."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {editing !== undefined && <ClassForm schoolClass={editing} onClose={() => setEditing(undefined)} />}
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
        {save.isError && <p className="text-sm text-red-600">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
