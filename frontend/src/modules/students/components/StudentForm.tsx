import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useState, type FormEvent } from "react";
import { useClasses, useSaveStudent } from "../api";
import type { Gender, Guardian, Student, StudentStatus } from "../types";
import { GuardianPicker } from "./GuardianPicker";

/** Add (student = null) or edit a student. */
export function StudentForm({ student, onClose }: { student: Student | null; onClose: () => void }) {
  const classes = useClasses();
  const save = useSaveStudent();

  const [form, setForm] = useState({
    admission_number: student?.admission_number ?? "",
    first_name: student?.first_name ?? "",
    last_name: student?.last_name ?? "",
    gender: (student?.gender ?? "M") as Gender,
    date_of_birth: student?.date_of_birth ?? "",
    admission_date: student?.admission_date ?? new Date().toISOString().slice(0, 10),
    status: (student?.status ?? "active") as StudentStatus,
    address: student?.address ?? "",
    school_class: student?.current_class ? String(student.current_class) : "",
  });
  const [guardians, setGuardians] = useState<Guardian[]>(student?.guardian_details ?? []);

  // set("first_name") returns an onChange handler that updates just that one key.
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      {
        id: student?.id,
        data: {
          ...form,
          date_of_birth: form.date_of_birth || null, // the API wants null, not "", for "no date"
          school_class: form.school_class ? Number(form.school_class) : null,
          guardians: guardians.map((g) => g.id),
        },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Modal title={student ? `Edit ${student.full_name}` : "Add student"} onClose={onClose}>
      <form id="student-form" onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <Field label="Admission number"><Input required value={form.admission_number} onChange={set("admission_number")} /></Field>
        <Field label="Class (current year)">
          <Select value={form.school_class} onChange={set("school_class")}>
            <option value="">Not placed</option>
            {classes.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <Field label="First name"><Input required value={form.first_name} onChange={set("first_name")} /></Field>
        <Field label="Last name"><Input required value={form.last_name} onChange={set("last_name")} /></Field>
        <Field label="Gender">
          <Select value={form.gender} onChange={set("gender")}>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </Select>
        </Field>
        <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
        <Field label="Admission date"><Input type="date" required value={form.admission_date} onChange={set("admission_date")} /></Field>
        <Field label="Status">
          <Select value={form.status} onChange={set("status")}>
            <option value="active">Active</option>
            <option value="left">Left</option>
            <option value="graduated">Graduated</option>
          </Select>
        </Field>
        <div className="col-span-2">
          <Field label="Home address"><Input value={form.address} onChange={set("address")} /></Field>
        </div>
      </form>

      {/* Outside the <form> on purpose: the picker opens its own guardian form,
          and HTML does not allow one form inside another. */}
      <div className="mt-4">
        <GuardianPicker selected={guardians} onChange={setGuardians} />
      </div>

      {save.isError && <p className="mt-3 text-sm text-red-600">{errorText(save.error)}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        {/* form="student-form" links this button to the form above even though it sits outside it. */}
        <Button form="student-form" disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
      </div>
    </Modal>
  );
}
