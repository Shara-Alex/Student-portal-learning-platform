import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { GraduationCap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApply, usePublicSchool } from "./api";
import type { ApplicationForm } from "./types";

const EMPTY: ApplicationForm = {
  first_name: "", last_name: "", gender: "M", date_of_birth: "", applying_for: "",
  previous_school: "", reason_for_transfer: "", medical_notes: "",
  guardian_first_name: "", guardian_last_name: "", guardian_relationship: "mother", guardian_phone: "", guardian_email: "",
};

/** The public application form at /apply. Anyone can open it; there is no login and no top bar. */
export function ApplyPage() {
  const school = usePublicSchool();
  const apply = useApply();
  const [form, setForm] = useState(EMPTY);
  const [document, setDocument] = useState<File | null>(null);
  const set = (key: keyof ApplicationForm) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });
  const name = school.data?.school || "our school";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.set(key, value));
    if (document) data.set("document", document);
    apply.mutate(data);
  }

  const heading = (text: string) => <p className="col-span-2 mt-2 border-t border-dashed border-line pt-3 text-xs font-extrabold uppercase tracking-wider text-ink-muted">{text}</p>;

  return (
    <div className="mx-auto max-w-2xl p-4 py-10">
      <div className="overflow-hidden rounded-lg bg-raised p-6 [box-shadow:inset_0_3px_0_var(--bus),var(--shadow-lift)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-board text-on-board"><GraduationCap size={24} /></div>
          <div>
            <h1 className="text-2xl font-extrabold">Apply for a place</h1>
            <p className="text-ink-muted">{name}</p>
          </div>
        </div>

        {apply.isSuccess ? (
          <div className="space-y-2 rounded-md bg-board-soft p-4 text-board">
            <p className="text-lg font-bold">Thank you. We have your application.</p>
            <p>The school will contact you on the phone number you gave.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
            <p className="col-span-2 text-xs font-extrabold uppercase tracking-wider text-ink-muted">The child</p>
            <Field label="First name"><Input required value={form.first_name} onChange={set("first_name")} /></Field>
            <Field label="Last name"><Input required value={form.last_name} onChange={set("last_name")} /></Field>
            <Field label="Gender"><Select value={form.gender} onChange={set("gender")}><option value="M">Male</option><option value="F">Female</option></Select></Field>
            <Field label="Date of birth"><Input type="date" required value={form.date_of_birth} onChange={set("date_of_birth")} /></Field>
            <Field label="Class applying for"><Input required placeholder="Form 1" value={form.applying_for} onChange={set("applying_for")} /></Field>
            <Field label="Current or last school"><Input value={form.previous_school} onChange={set("previous_school")} /></Field>
            <div className="col-span-2"><Field label="Reason for moving school (if any)"><Textarea value={form.reason_for_transfer} onChange={set("reason_for_transfer")} /></Field></div>
            <div className="col-span-2"><Field label="Allergies or medical conditions we should know about"><Textarea value={form.medical_notes} onChange={set("medical_notes")} /></Field></div>

            {heading("Parent or guardian")}
            <Field label="First name"><Input required value={form.guardian_first_name} onChange={set("guardian_first_name")} /></Field>
            <Field label="Last name"><Input required value={form.guardian_last_name} onChange={set("guardian_last_name")} /></Field>
            <Field label="Relationship to the child">
              <Select value={form.guardian_relationship} onChange={set("guardian_relationship")}>
                <option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Phone"><Input required type="tel" value={form.guardian_phone} onChange={set("guardian_phone")} /></Field>
            <div className="col-span-2"><Field label="Email (optional)"><Input type="email" value={form.guardian_email} onChange={set("guardian_email")} /></Field></div>

            {heading("Supporting document (optional)")}
            <div className="col-span-2">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="text-sm" onChange={(e) => setDocument(e.target.files?.[0] ?? null)} />
              <p className="mt-1 text-sm text-ink-muted">A birth certificate or the last school report. PDF or photo, up to 5 MB.</p>
            </div>

            {apply.isError && <p className="col-span-2 text-sm text-marker">{errorText(apply.error)}</p>}
            <div className="col-span-2 mt-2 flex justify-end">
              <Button busy={apply.isPending}>Send application</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
