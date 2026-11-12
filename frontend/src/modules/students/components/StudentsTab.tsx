import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { Presets } from "@/components/ui/presets";
import { Select } from "@/components/ui/select";
import { EmptyRow, Skeleton } from "@/components/ui/skeleton";
import { useView, ViewSwitcher, type View } from "@/components/ui/view-switcher";
import { cn } from "@/lib/utils";
import { useMe } from "@/modules/core/api";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useState } from "react";
import { useClasses, useStudents } from "../api";
import type { Student } from "../types";
import { StudentForm } from "./StudentForm";

// Homeroom's colour code: green = good, grey = inactive, blue = info.
const statusTone: Record<Student["status"], Tone> = { active: "good", left: "neutral", graduated: "info" };
// The same students two ways: a list for scanning, cards for phones.
const VIEWS: View<"list" | "cards">[] = [
  { key: "list", label: "List", icon: List },
  { key: "cards", label: "Cards", icon: LayoutGrid },
];

export function StudentsTab({ canEdit }: { canEdit: boolean }) {
  const me = useMe();
  const [view, setView] = useView(VIEWS);
  const [search, setSearch] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [status, setStatus] = useState("active");
  const [page, setPage] = useState(1);
  // undefined = form closed, null = adding a new student, a Student = editing that one
  const [editing, setEditing] = useState<Student | null | undefined>(undefined);

  const classes = useClasses();
  const students = useStudents({ search, school_class: schoolClass, status, page });
  const rows = students.data?.results ?? [];
  // A class teacher gets a one-tap "my class" chip (Homeroom's preset filters).
  const myClasses = (classes.data ?? []).filter((c) => c.class_teacher === me.data?.id);
  const open = canEdit ? (s: Student) => setEditing(s) : undefined;

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
        <Select className="w-40" aria-label="Class" value={schoolClass} onChange={(e) => filter(setSchoolClass)(e.target.value)}>
          <option value="">All classes</option>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select className="w-36" aria-label="Status" value={status} onChange={(e) => filter(setStatus)(e.target.value)}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="left">Left</option>
          <option value="graduated">Graduated</option>
        </Select>
        <div className="ml-auto"><ViewSwitcher views={VIEWS} value={view} onChange={setView} /></div>
      </div>
      {myClasses.length > 0 && (
        <Presets
          label="Quick filters"
          value={schoolClass}
          onChange={filter(setSchoolClass)}
          options={[{ key: "", label: "Whole school" }, ...myClasses.map((c) => ({ key: String(c.id), label: `My class: ${c.name}` }))]}
        />
      )}

      {view === "list" ? (
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
                <tr key={s.id} onClick={open && (() => open(s))} className={cn(open && "cursor-pointer")}>
                  <td className="font-mono">{s.admission_number}</td>
                  <td><div className="who"><Avatar name={s.full_name} />{s.full_name}</div></td>
                  <td>{s.current_class_name || <span className="text-ink-muted">Not placed</span>}</td>
                  <td className="text-ink-muted">{s.guardian_details.map((g) => g.full_name).join(", ") || "—"}</td>
                  <td><Badge tone={statusTone[s.status]}>{s.status}</Badge></td>
                </tr>
              ))}
              {!rows.length && <EmptyRow query={students} colSpan={5}>No students found.</EmptyRow>}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Homeroom's KanbanCard: avatar, name and one meta line; under the dashed line, one badge and one key figure. */}
          <div className="hr-kanban !p-0">
            {rows.map((s) => (
              <article key={s.id} className={cn("hr-card", open && "cursor-pointer hover:shadow-lift")} onClick={open && (() => open(s))}>
                <header>
                  <Avatar name={s.full_name} />
                  <div><h4>{s.full_name}</h4><div className="meta">{s.current_class_name || "Not placed"}</div></div>
                </header>
                <footer><Badge tone={statusTone[s.status]}>{s.status}</Badge><span className="mark text-sm">{s.admission_number}</span></footer>
              </article>
            ))}
          </div>
          {students.isLoading && <Skeleton title={false} />}
          {!rows.length && !students.isLoading && <Card className="text-ink-muted">No students found.</Card>}
        </>
      )}

      <Pager data={students.data} page={page} onPage={setPage} noun="student" />

      {editing !== undefined && <StudentForm student={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
