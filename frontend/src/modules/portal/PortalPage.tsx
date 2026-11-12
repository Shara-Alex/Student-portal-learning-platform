import { TermPicker } from "@/components/TermPicker";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useSections } from "@/lib/sections";
import { usePeriods, useTimetable } from "@/modules/academics/api";
import { TimetableGrid } from "@/modules/academics/components/TimetableGrid";
import { ReportCardView } from "@/modules/assessments/components/ReportCardView";
import { useStudentAttendance } from "@/modules/attendance/api";
import { attendanceTone } from "@/modules/attendance/components/SummaryTab";
import { useMoney, useStatement } from "@/modules/fees/api";
import { InvoiceDetail } from "@/modules/fees/components/InvoiceDetail";
import type { Student } from "@/modules/students/types";
import { useState } from "react";
import { sections } from "./sections";
import { useChild } from "./useChild";

/** What a parent (or the student) sees about one child: results, attendance, fees and timetable. Read-only. */
export function PortalPage() {
  const { current } = useSections(sections);
  const { children, child, setChild, loading } = useChild();
  const [term, setTerm] = useState("");
  const title = sections.find((s) => s.key === current)?.label ?? "";
  const needsTerm = current === "results" || current === "attendance";

  if (!loading && !child) {
    return <Card className="text-ink-muted">Your login is not linked to a student yet. Please ask the school office to link it.</Card>;
  }
  if (!child) return null;

  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {children.length > 1 ? (
          <Select className="w-56" aria-label="Child" value={child.id} onChange={(e) => setChild(e.target.value)}>
            {children.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </Select>
        ) : <span className="font-bold">{child.full_name}</span>}
        <span className="text-ink-muted">{child.current_class_name}</span>
        {needsTerm && <TermPicker value={term} onChange={setTerm} />}
      </div>
      {/* key: a different child is a different page, so nothing from the last one lingers */}
      {current === "results" && term && <ReportCardView key={child.id} student={child.id} term={term} />}
      {current === "attendance" && <Attendance child={child} term={term} />}
      {current === "fees" && <Fees child={child} />}
      {current === "timetable" && <Timetable child={child} />}
    </div>
  );
}

function Attendance({ child, term }: { child: Student; term: string }) {
  const data = useStudentAttendance(child.id, term).data;
  if (!data) return null;
  const label = { P: "Present", L: "Late", A: "Absent" };
  return (
    <div className="space-y-4">
      <div className="hr-stats !grid-cols-2 !p-0 sm:!grid-cols-4">
        <div className="hr-stat"><div className="k">Attendance</div><div className="v">{data.percent === null ? "–" : `${data.percent}%`}</div></div>
        <div className="hr-stat"><div className="k">Present</div><div className="v">{data.present}</div></div>
        <div className="hr-stat"><div className="k">Late</div><div className="v">{data.late}</div></div>
        <div className="hr-stat"><div className="k">Absent</div><div className={`v ${data.absent ? "down" : ""}`}>{data.absent}</div></div>
      </div>
      <Badge tone={attendanceTone(data.percent)}>{data.days} school day(s) marked this term</Badge>
      {data.recent.length > 0 && (
        <table className="hr-list">
          <thead><tr><th className="w-40">Date</th><th>Marked</th><th>Note</th></tr></thead>
          <tbody>
            {data.recent.map((r) => (
              <tr key={r.date}><td className="font-mono">{r.date}</td><td><Badge tone={r.status === "A" ? "bad" : "wait"}>{label[r.status]}</Badge></td><td className="text-ink-muted">{r.note || "—"}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {data.days > 0 && !data.recent.length && <Card className="text-ink-muted">Present every day so far this term.</Card>}
    </div>
  );
}

function Fees({ child }: { child: Student }) {
  const money = useMoney();
  const statement = useStatement(child.id).data;
  if (!statement) return null;
  return (
    <div className="space-y-4">
      <div className="hr-stats !grid-cols-2 !p-0">
        <div className="hr-stat"><div className="k">Fees owed</div><div className="v">{money(statement.balance)}</div></div>
        <div className="hr-stat"><div className="k">Overdue now</div><div className={`v ${statement.due_now ? "down" : ""}`}>{money(statement.due_now)}</div></div>
      </div>
      {statement.invoices.map((invoice) => <Card key={invoice.id}><InvoiceDetail invoice={invoice} canEdit={false} /></Card>)}
      {!statement.invoices.length && <Card className="text-ink-muted">No fees have been billed yet.</Card>}
    </div>
  );
}

function Timetable({ child }: { child: Student }) {
  const periods = usePeriods();
  const lessons = useTimetable({ school_class: String(child.current_class ?? "") }, !!child.current_class);
  if (!child.current_class) return <Card className="text-ink-muted">{child.first_name} has not been placed in a class yet.</Card>;
  return <TimetableGrid periods={periods.data ?? []} entries={lessons.data ?? []} detail={(e) => e.teacher_name} highlightDay={new Date().getDay()} />;
}
