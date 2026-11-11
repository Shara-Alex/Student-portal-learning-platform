import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useClasses } from "@/modules/students/api";
import { useState } from "react";
import { useClassResults } from "../api";
import { ReportCardView } from "./ReportCardView";
import { TermPicker } from "./TermPicker";

/** Pick a class and a term, see every student's average, open one to read or print their report card. */
export function ReportsTab() {
  const classes = useClasses();
  const [chosen, setChosen] = useState("");
  const [term, setTerm] = useState("");
  const [student, setStudent] = useState<number | null>(null);
  const classId = chosen || String(classes.data?.[0]?.id ?? "");
  const results = useClassResults(classId, term);
  const rows = results.data ?? [];

  if (student !== null) return <ReportCardView student={student} term={term} onBack={() => setStudent(null)} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Report cards" />
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-48" aria-label="Class" value={classId} onChange={(e) => setChosen(e.target.value)}>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <TermPicker value={term} onChange={setTerm} />
      </div>
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Student</th>
              <th>Adm. no.</th>
              <th className="num">Subjects marked</th>
              <th className="num">Average</th>
              <th className="num">Grade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student} className="cursor-pointer" onClick={() => setStudent(r.student)}>
                <td><div className="who"><Avatar name={r.full_name} />{r.full_name}</div></td>
                <td className="font-mono">{r.admission_number}</td>
                <td className="num">{r.subjects}</td>
                <td className="num">{r.average === null ? "—" : `${r.average}%`}</td>
                <td className="num font-bold">{r.grade || "—"}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="!py-8 text-center text-ink-muted">{results.isLoading ? "Loading…" : "No students in this class."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
