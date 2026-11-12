import { EmptyRow } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useTeachers } from "@/modules/core/api";
import { useClasses } from "@/modules/students/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAssignments, useDeleteAssignment, useSaveAssignment, useSubjects } from "../api";
import type { TeachingAssignment } from "../types";

export function AssignmentsTab({ canEdit }: { canEdit: boolean }) {
  const classes = useClasses();
  const [classId, setClassId] = useState("");
  const [editing, setEditing] = useState<TeachingAssignment | null | undefined>(undefined);
  const assignments = useAssignments({ school_class: classId });
  const remove = useDeleteAssignment();
  const rows = assignments.data ?? [];

  function onDelete(a: TeachingAssignment) {
    if (window.confirm(`Remove ${a.subject_name} from ${a.school_class_name}? Its timetable lessons will be removed too.`)) remove.mutate(a.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Who teaches what">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Assign teacher</Button>}
      </PageHeader>
      <div className="flex items-center gap-2">
        <Select className="w-48" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">All classes</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Class</th>
              <th>Subject</th>
              <th>Teacher</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.school_class_name}</td>
                <td className="font-bold">{a.subject_name}</td>
                <td>{a.teacher_name}</td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => setEditing(a)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Remove ${a.subject_name} from ${a.school_class_name}`} onClick={() => onDelete(a)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <EmptyRow query={assignments} colSpan={4}>Nothing assigned yet.</EmptyRow>}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <AssignmentForm assignment={editing} defaultClass={classId} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function AssignmentForm({ assignment, defaultClass, onClose }: { assignment: TeachingAssignment | null; defaultClass: string; onClose: () => void }) {
  const classes = useClasses();
  const subjects = useSubjects();
  const teachers = useTeachers();
  const save = useSaveAssignment();
  const [schoolClass, setSchoolClass] = useState(assignment ? String(assignment.school_class) : defaultClass);
  const [subject, setSubject] = useState(assignment ? String(assignment.subject) : "");
  const [teacher, setTeacher] = useState(assignment ? String(assignment.teacher) : "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: assignment?.id, data: { school_class: Number(schoolClass), subject: Number(subject), teacher: Number(teacher) } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={assignment ? "Edit assignment" : "Assign teacher"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Class">
          <Select required value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)}>
            <option value="">Choose…</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="Subject">
          <Select required value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">Choose…</option>
            {subjects.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Teacher">
          <Select required value={teacher} onChange={(e) => setTeacher(e.target.value)}>
            <option value="">Choose…</option>
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
