import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { errorText } from "@/lib/api";
import { useClasses } from "@/modules/students/api";
import { useState } from "react";
import { useMyRegisters, useRegister, useSaveRegister } from "../api";
import type { Mark, Register } from "../types";

const today = () => new Date().toLocaleDateString("en-CA"); // "2026-11-11" in local time
const CHOICES: { value: Mark; letter: string; label: string; css: string }[] = [
  { value: "P", letter: "P", label: "Present", css: "p" },
  { value: "L", letter: "L", label: "Late", css: "l" },
  { value: "A", letter: "A", label: "Absent", css: "a" },
];

/** Homeroom's RegisterGrid: everyone starts Present, the teacher taps only the exceptions. */
export function RegisterTab() {
  const classes = useClasses();
  const mine = useMyRegisters();
  const [chosen, setChosen] = useState("");
  const [date, setDate] = useState(today());
  // Open on the class this teacher is class teacher of, if any; otherwise the first class.
  const classId = chosen || String(mine.data?.[0]?.school_class ?? classes.data?.[0]?.id ?? "");
  const register = useRegister(classId, date);

  return (
    <div className="space-y-4">
      <PageHeader title="Register">
        {register.data && <Badge tone={register.data.submitted ? "good" : "wait"}>{register.data.submitted ? "Submitted" : "Not marked yet"}</Badge>}
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-48" aria-label="Class" value={classId} onChange={(e) => setChosen(e.target.value)}>
          {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input className="w-44" type="date" aria-label="Date" max={today()} value={date} onChange={(e) => setDate(e.target.value || today())} />
      </div>
      {register.isLoading && <Skeleton rows={5} title={false} />}
      {/* key: a different class or day is a different register, so start its buttons afresh */}
      {register.data && <Grid key={`${classId}-${date}-${register.dataUpdatedAt}`} register={register.data} classId={classId} date={date} />}
    </div>
  );
}

function Grid({ register, classId, date }: { register: Register; classId: string; date: string }) {
  const save = useSaveRegister();
  const [marks, setMarks] = useState<Record<number, Mark>>(() => Object.fromEntries(register.rows.map((r) => [r.student, r.status])));
  const count = (mark: Mark) => Object.values(marks).filter((m) => m === mark).length;

  if (!register.rows.length) return <Card className="text-ink-muted">This class has no students yet.</Card>;

  return (
    <div className="max-w-2xl space-y-3">
      <div className="hr-register">
        {register.rows.map((row) => (
          <div key={row.student} className="r">
            <span className="nm">{row.full_name}</span>
            <span className="hr-pla" role="group" aria-label={`Attendance for ${row.full_name}`}>
              {CHOICES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className={c.css}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={marks[row.student] === c.value}
                  disabled={!register.can_mark}
                  onClick={() => setMarks({ ...marks, [row.student]: c.value })}
                >
                  {c.letter}
                </button>
              ))}
            </span>
          </div>
        ))}
        <div className="sum">
          <span>Present <b>{count("P")}</b></span>
          <span>Late <b>{count("L")}</b></span>
          <span>Absent <b>{count("A")}</b></span>
        </div>
      </div>
      {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
      {register.can_mark ? (
        <Button
          busy={save.isPending}
          onClick={() => save.mutate({ schoolClass: classId, date, entries: register.rows.map((r) => ({ student: r.student, status: marks[r.student] })) })}
        >
          {register.submitted ? "Save changes" : "Submit register"}
        </Button>
      ) : (
        <p className="text-sm text-ink-muted">Only this class's teachers can mark its register.</p>
      )}
    </div>
  );
}
