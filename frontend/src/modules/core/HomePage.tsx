import { useSubjects } from "@/modules/academics/api";
import { modules } from "@/modules/registry";
import { useClasses, useStudents } from "@/modules/students/api";
import { Link } from "react-router-dom";
import { useMe, useSchool } from "./api";

function greeting() {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** Home: a greeting, a few headline numbers for staff, then one tile per app (like Odoo's home menu). */
export function HomePage() {
  const me = useMe();
  const school = useSchool();
  const role = me.data?.role;
  const isStaff = role === "admin" || role === "teacher";
  const apps = modules.filter((m) => role && m.roles.includes(role));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {greeting()}{me.data ? `, ${me.data.first_name || me.data.username}` : ""}
        </h1>
        <p className="text-ink-muted">{school.data?.name ?? "School not set up yet. Add it in /admin."}</p>
      </div>

      {isStaff && <StaffStats />}

      {apps.length ? (
        <div className="hr-apps !p-0">
          {apps.map((m) => (
            <Link key={m.name} to={`/${m.name}`} className="hr-app">
              <i className={`c-${m.color}`}><m.icon size={28} /></i>
              {m.label}
            </Link>
          ))}
        </div>
      ) : (
        me.data && <p className="text-ink-muted">The parent and student portal is still being built.</p>
      )}
    </div>
  );
}

/** Real counts only. A separate component so parents and students never call these staff lists. */
function StaffStats() {
  const students = useStudents({ status: "active", page_size: 1 }); // we only need the total count
  const classes = useClasses();
  const subjects = useSubjects();
  const stats = [
    { label: "Active students", value: students.data?.count },
    { label: "Classes", value: classes.data?.length },
    { label: "Subjects", value: subjects.data?.length },
  ];
  return (
    <div className="hr-stats !grid-cols-2 !p-0 sm:!grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="hr-stat">
          <div className="k">{s.label}</div>
          <div className="v">{s.value ?? "–"}</div>
        </div>
      ))}
    </div>
  );
}
