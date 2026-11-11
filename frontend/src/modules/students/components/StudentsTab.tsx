import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useClasses, useStudents } from "../api";
import type { Student } from "../types";
import { StudentForm } from "./StudentForm";

// Homeroom's colour code: green = good, grey = inactive, blue = info.
const statusTone: Record<Student["status"], Tone> = { active: "good", left: "neutral", graduated: "info" };

export function StudentsTab({ canEdit }: { canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  // undefined = form closed, null = adding a new student, a Student = editing that one
  const [editing, setEditing] = useState<Student | null | undefined>(undefined);

  const classes = useClasses();
  const students = useStudents({ search, school_class: schoolClass, status, page });
  const rows = students.data?.results ?? [];

  // Changing a filter must send us back to page 1, or we could ask for a page that no longer exists.
  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Students">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add student</Button>}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search name or admission no." value={search} onChange={(e) => filter(setSearch)(e.target.value)} />
        <Select className="w-40" value={schoolClass} onChange={(e) => filter(setSchoolClass)(e.target.value)}>
          <option value="">All classes</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="w-36" value={status} onChange={(e) => filter(setStatus)(e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="left">Left</option>
          <option value="graduated">Graduated</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Adm. no.</th>
              <th>Name</th>
              <th>Class</th>
              <th>Guardians</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={canEdit ? () => setEditing(s) : undefined}
                className={cn(canEdit && "cursor-pointer")}
              >
                <td className="font-mono">{s.admission_number}</td>
                <td><div className="who"><Avatar name={s.full_name} />{s.full_name}</div></td>
                <td>{s.current_class_name || <span className="text-ink-muted">Not placed</span>}</td>
                <td className="text-ink-muted">{s.guardian_details.map((g) => g.full_name).join(", ") || "—"}</td>
                <td><Badge tone={statusTone[s.status]}>{s.status}</Badge></td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="!py-8 text-center text-ink-muted">{students.isLoading ? "Loading…" : "No students found."}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>{students.data?.count ?? 0} student(s)</span>
        <div className="flex gap-2">
          <Button variant="default" disabled={!students.data?.previous} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="default" disabled={!students.data?.next} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>

      {editing !== undefined && <StudentForm student={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
