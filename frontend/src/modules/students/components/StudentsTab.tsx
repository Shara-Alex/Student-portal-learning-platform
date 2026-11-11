import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useClasses, useStudents } from "../api";
import type { Student } from "../types";
import { StudentForm } from "./StudentForm";

const statusStyle: Record<Student["status"], string> = {
  active: "bg-green-100 text-green-700",
  left: "bg-slate-100 text-slate-600",
  graduated: "bg-blue-100 text-blue-700",
};

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
    <div className="space-y-3">
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
        {canEdit && <Button className="ml-auto" onClick={() => setEditing(null)}><Plus size={16} /> Add student</Button>}
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Adm. no.</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Guardians</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={canEdit ? () => setEditing(s) : undefined}
                className={cn("border-b border-slate-100 last:border-0", canEdit && "cursor-pointer hover:bg-slate-50")}
              >
                <td className="px-4 py-3 font-mono text-xs">{s.admission_number}</td>
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3">{s.current_class_name || <span className="text-slate-400">Not placed</span>}</td>
                <td className="px-4 py-3 text-slate-600">{s.guardian_details.map((g) => g.full_name).join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs capitalize", statusStyle[s.status])}>{s.status}</span>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{students.isLoading ? "Loading…" : "No students found."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>{students.data?.count ?? 0} student(s)</span>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={!students.data?.previous} onClick={() => setPage(page - 1)}>Previous</Button>
          <Button variant="ghost" disabled={!students.data?.next} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>

      {editing !== undefined && <StudentForm student={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
