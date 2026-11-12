import { FINANCE, inGroup, OFFICE, TEACHING } from "@/lib/roles";
import { currentTerm } from "@/lib/term";
import { useApplications } from "@/modules/admissions/api";
import { useOutstanding } from "@/modules/assessments/api";
import { useMyRegisters } from "@/modules/attendance/api";
import { useUnreadCount } from "@/modules/communication/api";
import { useFeeSummary } from "@/modules/fees/api";
import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useTerms } from "../api";
import type { Role } from "../types";

interface Todo {
  key: string;
  title: string;
  detail: string;
  to: string;     // where the button goes
  action: string; // what the button says
  done?: boolean;
}

/** Homeroom's to-do list: what needs doing now, each with one button. Finished items get a red tick. */
export function TodoList({ role }: { role: Role }) {
  const isAdmin = role === "admin";
  const teaches = inGroup(role, TEACHING);
  const term = currentTerm(useTerms().data?.results);
  // Each list is only asked for if this role is allowed to see it.
  const registers = useMyRegisters(teaches);
  const marks = useOutstanding(teaches);
  const unread = useUnreadCount();
  const applications = useApplications(inGroup(role, OFFICE));
  const fees = useFeeSummary(term ? String(term.id) : "", inGroup(role, FINANCE));

  const todos: Todo[] = [];
  if (isAdmin) {
    // The admin does not mark registers, they chase them: one line for the whole school.
    const all = registers.data ?? [];
    const missing = all.filter((r) => !r.submitted);
    if (all.length) {
      todos.push({ key: "registers", title: "Today's registers", detail: `Not marked yet: ${missing.map((r) => r.name).join(", ")}`, to: "/attendance", action: "Open attendance", done: !missing.length });
    }
  } else {
    for (const r of registers.data ?? []) {
      todos.push({ key: `register-${r.school_class}`, title: `Mark the register for ${r.name}`, detail: `${r.students} students`, to: "/attendance", action: "Mark register", done: r.submitted });
    }
  }
  for (const a of marks.data ?? []) {
    todos.push({ key: `marks-${a.id}`, title: `Enter marks for ${a.name}`, detail: `${a.school_class_name} ${a.subject_name} · ${a.marked} of ${a.students} marked`, to: "/assessments", action: "Open markbook" });
  }
  if (unread.data?.count) {
    todos.push({ key: "messages", title: "Read your messages", detail: `${unread.data.count} unread`, to: "/communication", action: "Open inbox" });
  }
  const waiting = (applications.data ?? []).filter((a) => a.status === "applied").length;
  if (waiting) {
    todos.push({ key: "applications", title: "Review new applications", detail: `${waiting} waiting for a first look`, to: "/admissions", action: "Open admissions" });
  }
  if (fees.data?.overdue) {
    todos.push({ key: "fees", title: "Follow up overdue fees", detail: `${fees.data.overdue} invoice(s) overdue`, to: "/fees", action: "Open invoices" });
  }
  todos.sort((a, b) => Number(!!a.done) - Number(!!b.done)); // things still to do come first

  if (!todos.length) {
    return (
      <div className="hr-todo done">
        <span className="hr-tick" aria-hidden="true">✓</span>
        <div className="what"><b className="!no-underline">Nothing needs doing right now</b><span>You are up to date.</span></div>
      </div>
    );
  }
  return (
    // hr-stagger: the items arrive one after another, 40ms apart. --i is each item's place in the queue (capped at 8).
    <div className="hr-stagger space-y-2">
      {todos.map((t, i) => (
        <div key={t.key} className={`hr-todo ${t.done ? "done" : ""}`} style={{ "--i": Math.min(i, 8) } as CSSProperties}>
          {t.done && <span className="hr-tick" aria-hidden="true">✓</span>}
          <div className="what"><b>{t.title}</b><span>{t.done ? "Done" : t.detail}</span></div>
          <Link to={t.to} className={`hr-btn ${t.done ? "" : "hr-btn-primary"}`}>{t.done ? "View" : t.action}</Link>
        </div>
      ))}
    </div>
  );
}
