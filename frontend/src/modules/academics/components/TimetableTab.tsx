import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useClasses } from "@/modules/students/api";
import { useState, type FormEvent } from "react";
import { useAssignments, useDeleteLesson, usePeriods, useSaveLesson, useTimetable } from "../api";
import { DAYS, type Period, type TimetableEntry } from "../types";
import { TimetableGrid } from "./TimetableGrid";

interface Slot {
  day: number;
  period: Period;
  entry?: TimetableEntry;
}

export function TimetableTab({ canEdit }: { canEdit: boolean }) {
  const classes = useClasses();
  const periods = usePeriods();
  const [chosen, setChosen] = useState("");
  // Until the user picks a class, show the first one.
  const classId = chosen || String(classes.data?.[0]?.id ?? "");
  const lessons = useTimetable({ school_class: classId }, !!classId);
  const [slot, setSlot] = useState<Slot | null>(null);

  return (
    <div className="space-y-4">
      <PageHeader title="Class timetables" />
      <Select className="w-48" value={classId} onChange={(e) => setChosen(e.target.value)}>
        {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      <TimetableGrid
        periods={periods.data ?? []}
        entries={lessons.data ?? []}
        detail={(e) => e.teacher_name}
        onCell={canEdit ? (day, period, entry) => setSlot({ day, period, entry }) : undefined}
      />
      {slot && <LessonForm classId={classId} slot={slot} onClose={() => setSlot(null)} />}
    </div>
  );
}

/** Pick which subject (teaching assignment) goes in one slot, or clear the slot. */
function LessonForm({ classId, slot, onClose }: { classId: string; slot: Slot; onClose: () => void }) {
  const assignments = useAssignments({ school_class: classId });
  const save = useSaveLesson();
  const remove = useDeleteLesson();
  const [assignment, setAssignment] = useState(slot.entry ? String(slot.entry.assignment) : "");
  const [room, setRoom] = useState(slot.entry?.room ?? "");
  const day = DAYS.find((d) => d.value === slot.day)?.label;
  const error = save.error ?? remove.error;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: slot.entry?.id, data: { assignment: Number(assignment), day: slot.day, period: slot.period.id, room } },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={`${day}, ${slot.period.name}`} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Lesson">
          <Select required value={assignment} onChange={(e) => setAssignment(e.target.value)}>
            <option value="">Choose a subject…</option>
            {assignments.data?.map((a) => <option key={a.id} value={a.id}>{a.subject_name} ({a.teacher_name})</option>)}
          </Select>
        </Field>
        {assignments.data?.length === 0 && (
          <p className="text-sm text-bus-ink">This class has no subjects yet. Add them under "Who teaches what" first.</p>
        )}
        <Field label="Room (optional)"><Input value={room} onChange={(e) => setRoom(e.target.value)} /></Field>
        {error && <p className="text-sm text-marker">{errorText(error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {slot.entry && (
            <Button type="button" variant="danger" className="mr-auto" onClick={() => remove.mutate(slot.entry!.id, { onSuccess: onClose })}>
              Clear slot
            </Button>
          )}
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
