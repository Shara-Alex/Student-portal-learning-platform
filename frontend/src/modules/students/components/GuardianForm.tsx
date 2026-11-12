import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { useState, type FormEvent } from "react";
import { useSaveGuardian } from "../api";
import type { Guardian, GuardianInput } from "../types";
import { LoginBox } from "./LoginBox";

interface Props {
  guardian: Guardian | null; // null = add a new one
  onClose: () => void;
  onSaved?: (g: Guardian) => void; // lets the student form pick up a guardian created on the spot
}

export function GuardianForm({ guardian, onClose, onSaved }: Props) {
  const save = useSaveGuardian();
  const [form, setForm] = useState<GuardianInput>({
    first_name: guardian?.first_name ?? "",
    last_name: guardian?.last_name ?? "",
    relationship: guardian?.relationship ?? "guardian",
    phone: guardian?.phone ?? "",
    email: guardian?.email ?? "",
    address: guardian?.address ?? "",
  });
  const set = (key: keyof GuardianInput) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(
      { id: guardian?.id, data: form },
      {
        onSuccess: (saved) => {
          onSaved?.(saved);
          onClose();
        },
      },
    );
  }

  return (
    <Modal title={guardian ? `Edit ${guardian.full_name}` : "Add guardian"} onClose={onClose}>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <Field label="First name"><Input required value={form.first_name} onChange={set("first_name")} /></Field>
        <Field label="Last name"><Input required value={form.last_name} onChange={set("last_name")} /></Field>
        <Field label="Relationship">
          <Select value={form.relationship} onChange={set("relationship")}>
            <option value="mother">Mother</option>
            <option value="father">Father</option>
            <option value="guardian">Guardian</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
        {save.isError && <p className="col-span-2 text-sm text-marker">{errorText(save.error)}</p>}
        <div className="col-span-2 mt-2 flex justify-end gap-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>
        </div>
      </form>
      {guardian && <LoginBox kind="guardians" id={guardian.id} username={guardian.username} who="guardian" />}
    </Modal>
  );
}
