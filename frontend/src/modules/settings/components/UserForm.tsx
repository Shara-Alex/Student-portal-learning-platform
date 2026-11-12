import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { ALL_STAFF, FAMILY, inGroup, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/modules/core/types";
import { useState, type FormEvent } from "react";
import { useSaveUser, useSetPassword } from "../api";
import type { AdminUser } from "../types";

interface Props {
  user: AdminUser | null; // null = add a new one
  isSelf: boolean;        // the admin is looking at their own login
  onClose: () => void;
}

/** Add a staff login, or edit any login: details, role, a new password, deactivate. */
export function UserForm({ user, isSelf, onClose }: Props) {
  const save = useSaveUser();
  // A parent's or student's login. Its role is fixed: the server refuses to turn it into a staff login.
  const family = !!user && inGroup(user.role, FAMILY);
  const [form, setForm] = useState({
    username: user?.username ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    role: (user?.role ?? "teacher") as Role,
  });
  const [password, setPassword] = useState("");
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // The password travels only when adding. Afterwards it is changed with "Set new password" below.
    save.mutate({ id: user?.id, data: user ? form : { ...form, password } }, { onSuccess: onClose });
  }

  function setActive(is_active: boolean) {
    if (!user) return;
    const name = user.full_name || user.username;
    const sure = is_active || window.confirm(`Deactivate ${name}? They will not be able to sign in. Their name stays on the marks and messages they wrote.`);
    if (sure) save.mutate({ id: user.id, data: { is_active } }, { onSuccess: onClose });
  }

  return (
    <Modal title={user ? `Edit ${user.full_name || user.username}` : "Add user"} onClose={onClose}>
      <form id="user-form" onSubmit={onSubmit} className="grid grid-cols-2 gap-3">
        <Field label="First name"><Input required value={form.first_name} onChange={set("first_name")} /></Field>
        <Field label="Last name"><Input required value={form.last_name} onChange={set("last_name")} /></Field>
        <Field label="Username"><Input required autoComplete="off" value={form.username} onChange={set("username")} /></Field>
        <Field label="Role">
          <Select value={form.role} onChange={set("role")} disabled={family || isSelf}>
            {(family ? FAMILY : ALL_STAFF).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </Select>
        </Field>
        <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        {!user && (
          <div className="col-span-2">
            <Field label="Password (8 or more characters)">
              <Input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
          </div>
        )}
        <p className="col-span-2 text-sm text-ink-muted">
          {family && `${user.linked_to}. Family logins are created from the guardian's or student's own record. `}
          {isSelf && "This is your own login, so you cannot change its role or deactivate it. Ask another administrator. "}
          {!user && "An email address lets this person reset a forgotten password themselves."}
        </p>
      </form>

      {/* Outside the <form> on purpose: these act straight away and are not part of "Save". */}
      {user && <NewPassword user={user} />}

      {save.isError && <p className="mt-3 text-sm text-marker">{errorText(save.error)}</p>}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {user && !isSelf && (user.is_active
          ? <Button type="button" variant="danger" className="mr-auto" onClick={() => setActive(false)}>Deactivate</Button>
          : <Button type="button" variant="default" className="mr-auto" onClick={() => setActive(true)}>Reactivate</Button>)}
        <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
        {/* form="user-form" links this button to the form above even though it sits outside it. */}
        <Button form="user-form" busy={save.isPending}>Save</Button>
      </div>
    </Modal>
  );
}

/** An admin sets a new password for someone who has forgotten theirs. Not a <form>, so it can sit beside one. */
function NewPassword({ user }: { user: AdminUser }) {
  const setIt = useSetPassword();
  const [password, setPassword] = useState("");
  return (
    <div className="mt-4 space-y-2 border-t border-dashed border-line pt-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Set a new password</p>
      <div className="flex flex-wrap gap-2">
        <Input className="min-w-0 flex-1" type="password" placeholder="New password (8 or more characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="button" variant="default" busy={setIt.isPending} disabled={!password} onClick={() => setIt.mutate({ id: user.id, password }, { onSuccess: () => setPassword("") })}>
          Set password
        </Button>
      </div>
      {setIt.isSuccess && <p className="text-sm text-board">Password changed. Tell {user.first_name || user.username} the new one; their old one no longer works.</p>}
      {setIt.isError && <p className="text-sm text-marker">{errorText(setIt.error)}</p>}
    </div>
  );
}
