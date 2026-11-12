import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { errorText } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";
import { useState, type FormEvent } from "react";
import { useChangePassword, useMe, useSaveMe } from "./api";
import type { User } from "./types";

/** My account: everyone can change their own name, contact details and password. Never their username or role. */
export function AccountPage() {
  const me = useMe();
  if (!me.data) return <Skeleton />;
  return (
    <div className="space-y-4">
      <Details user={me.data} />
      <Password />
    </div>
  );
}

function Details({ user }: { user: User }) {
  const save = useSaveMe();
  const [form, setForm] = useState({ first_name: user.first_name, last_name: user.last_name, email: user.email, phone: user.phone });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [key]: e.target.value });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <>
      <PageHeader title="My account">
        <Button form="account-form" busy={save.isPending}>Save</Button>
      </PageHeader>
      {save.isSuccess && <p className="text-sm text-board">Saved.</p>}
      {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
      <Card>
        <form id="account-form" onSubmit={onSubmit} className="max-w-2xl space-y-3">
          <Field side label="Username"><Input className="font-mono" disabled value={user.username} /></Field>
          <Field side label="Role"><Input disabled value={ROLE_LABELS[user.role]} /></Field>
          <Field side label="First name"><Input value={form.first_name} onChange={set("first_name")} /></Field>
          <Field side label="Last name"><Input value={form.last_name} onChange={set("last_name")} /></Field>
          <Field side label="Email"><Input type="email" value={form.email} onChange={set("email")} /></Field>
          <Field side label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
          <p className="text-sm text-ink-muted">Your email is where a "forgot password" link is sent. Only an administrator can change a username or a role.</p>
        </form>
      </Card>
    </>
  );
}

function Password() {
  const change = useChangePassword();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const mismatch = again !== "" && again !== next;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (next !== again) return;
    change.mutate({ current_password: current, new_password: next }, { onSuccess: () => { setCurrent(""); setNext(""); setAgain(""); } });
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">Change password</h2>
      <form onSubmit={onSubmit} className="max-w-2xl space-y-3">
        <Field side label="Current password"><Input type="password" required autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></Field>
        <Field side label="New password"><Input type="password" required minLength={8} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} /></Field>
        <Field side label="Type it again"><Input type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></Field>
        {mismatch && <p className="text-sm text-marker">The two new passwords are not the same yet.</p>}
        {change.isError && <p className="text-sm text-marker">{errorText(change.error)}</p>}
        {change.isSuccess && <p className="text-sm text-board">Password changed. You stay signed in here; every other device has been signed out.</p>}
        {/* "default", not green: the one primary button on this screen is Save, at the top. */}
        <Button variant="default" busy={change.isPending} disabled={mismatch}>Change password</Button>
      </form>
    </Card>
  );
}
