import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/api";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useResetPassword } from "./api";
import { AuthCard } from "./AuthCard";

/**
 * Step 2 of "forgot password": the page the emailed link opens.
 * The link looks like /reset-password?uid=...&token=...  Those two codes prove who is asking;
 * we pass them back to the server together with the new password.
 */
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "";
  const token = params.get("token") ?? "";
  const reset = useResetPassword();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const mismatch = again !== "" && again !== password;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== again) return;
    reset.mutate({ uid, token, new_password: password });
  }

  const back = <p className="mt-4 text-center text-sm"><Link to="/login" className="font-bold text-pen">Go to sign in</Link></p>;

  if (!uid || !token) {
    return (
      <AuthCard title="Choose a new password">
        <p className="text-marker">This link is incomplete. Open the link from your email again, or ask for a new one.</p>
        <p className="mt-4 text-center text-sm"><Link to="/forgot-password" className="font-bold text-pen">Ask for a new link</Link></p>
      </AuthCard>
    );
  }
  if (reset.isSuccess) {
    return (
      <AuthCard title="Password changed">
        <p className="rounded-md bg-board-soft p-4 text-board">Your new password is saved. Sign in with it now.</p>
        {back}
      </AuthCard>
    );
  }
  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="New password (8 or more characters)"><Input type="password" required minLength={8} autoFocus autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Type it again"><Input type="password" required autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} /></Field>
        {mismatch && <p className="text-sm text-marker">The two passwords are not the same yet.</p>}
        {reset.isError && <p className="text-sm text-marker">{errorText(reset.error)}</p>}
        <Button className="mt-2 w-full" busy={reset.isPending} disabled={mismatch}>Save new password</Button>
      </form>
      {back}
    </AuthCard>
  );
}
