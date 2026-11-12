import { EmptyRow } from "@/components/ui/skeleton";
import { TermPicker } from "@/components/TermPicker";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useClasses } from "@/modules/students/api";
import { useState } from "react";
import { useAttendanceSummary } from "../api";

/** 90% and above is good, 75% and above needs watching, below that is a concern. */
export const attendanceTone = (percent: number | null): Tone => (percent === null ? "neutral" : percent >= 90 ? "good" : percent >= 75 ? "wait" : "bad");

export function SummaryTab() {
  const classes = useClasses();
  const [chosen, setChosen] = useState("");
  const [term, setTerm] = useState("");
  const classId = chosen || String(classes.data?.[0]?.id ?? "");
  const summary = useAttendanceSummary(classId, term);
  const rows = summary.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Term summary" />
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-48" aria-label="Class" value={classId} onChange={(e) => setChosen(e.target.value)}>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <TermPicker value={term} onChange={setTerm} />
      </div>
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr><th>Student</th><th className="num">Present</th><th className="num">Late</th><th className="num">Absent</th><th className="num">Days marked</th><th>Attendance</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.student}>
                <td><div className="who"><Avatar name={r.full_name} />{r.full_name}</div></td>
                <td className="num">{r.present}</td>
                <td className="num">{r.late}</td>
                <td className="num">{r.absent}</td>
                <td className="num">{r.days}</td>
                <td><Badge tone={attendanceTone(r.percent)}>{r.percent === null ? "No registers" : `${r.percent}%`}</Badge></td>
              </tr>
            ))}
            {!rows.length && <EmptyRow query={summary} colSpan={6}>No students in this class.</EmptyRow>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
