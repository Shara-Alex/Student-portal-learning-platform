import { TermPicker } from "@/components/TermPicker";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useStudentAttendance } from "@/modules/attendance/api";
import { attendanceTone } from "@/modules/attendance/components/SummaryTab";
import { useMoney, useStatement } from "@/modules/fees/api";
import { useStudents } from "@/modules/students/api";
import type { Student } from "@/modules/students/types";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DayStrip } from "./DayStrip";

/** Today for a parent or a student: each child's day, attendance and fees at a glance. */
export function FamilyToday() {
  // The server only ever sends a parent their own children, and a student themselves.
  const children = useStudents({});
  const [term, setTerm] = useState("");
  const list = children.data?.results ?? [];

  if (!children.isLoading && !list.length) {
    return <Card className="text-ink-muted">Your login is not linked to a student yet. Please ask the school office to link it.</Card>;
  }
  return (
    <div className="space-y-4">
      {/* Invisible, but it picks the current term for the cards below. */}
      <div className="hidden"><TermPicker value={term} onChange={setTerm} /></div>
      {list.map((child) => <ChildCard key={child.id} child={child} term={term} />)}
    </div>
  );
}

function ChildCard({ child, term }: { child: Student; term: string }) {
  const money = useMoney();
  const attendance = useStudentAttendance(child.id, term);
  const fees = useStatement(child.id);
  const link = (tab: string, label: string) => <Link to={`/portal?tab=${tab}&child=${child.id}`} className="hr-btn hr-btn-ghost">{label}</Link>;

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{child.full_name}</h2>
        <span className="text-ink-muted">{child.current_class_name || "Not in a class yet"}</span>
        {attendance.data && <Badge tone={attendanceTone(attendance.data.percent)}>{attendance.data.percent === null ? "No registers yet" : `${attendance.data.percent}% attendance`}</Badge>}
        {fees.data && fees.data.invoices.length > 0 && (fees.data.due_now > 0
          ? <Badge tone="bad">{money(fees.data.due_now)} overdue</Badge>
          : fees.data.balance > 0 ? <Badge tone="info">{money(fees.data.balance)} owed</Badge> : <Badge tone="good">Fees paid</Badge>)}
      </div>
      {child.current_class && <DayStrip filters={{ school_class: String(child.current_class) }} detail={(e) => e.teacher_name} />}
      <div className="flex flex-wrap gap-1 border-t border-dashed border-line pt-2">
        {link("results", "Results")}{link("attendance", "Attendance")}{link("fees", "Fees")}{link("timetable", "Timetable")}
      </div>
    </Card>
  );
}
