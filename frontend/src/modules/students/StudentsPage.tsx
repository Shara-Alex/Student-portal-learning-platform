import { cn } from "@/lib/utils";
import { useMe } from "@/modules/core/api";
import { useState } from "react";
import { ClassesTab } from "./components/ClassesTab";
import { GuardiansTab } from "./components/GuardiansTab";
import { StudentsTab } from "./components/StudentsTab";

const tabs = [
  { key: "students", label: "Students" },
  { key: "classes", label: "Classes" },
  { key: "guardians", label: "Guardians" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export function StudentsPage() {
  const [tab, setTab] = useState<TabKey>("students");
  const me = useMe();
  const canEdit = me.data?.role === "admin"; // teachers get a read-only view

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Students</h1>
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm",
              tab === t.key ? "border-brand font-medium text-brand" : "border-transparent text-slate-600 hover:text-slate-900",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "students" && <StudentsTab canEdit={canEdit} />}
      {tab === "classes" && <ClassesTab canEdit={canEdit} />}
      {tab === "guardians" && <GuardiansTab canEdit={canEdit} />}
    </div>
  );
}
