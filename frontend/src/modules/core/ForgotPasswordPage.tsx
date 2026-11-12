import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/api";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useForgotPassword } from "./api";
import { AuthCard } from "./AuthCard";

/** Step 1 of "forgot password": say who you are and we email you a link. */
export function ForgotPasswordPage() {
  const ask = useForgotPassword();
  const [identifier, setIdentifier] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask.mutate(identifier);
  }

  return (
    <AuthCard title="Forgot your password?">
      {ask.isSuccess ? (
        // The same message whether or not the account exists. Saying "no such user" would let a stranger test which usernames are real.
        <div className="space-y-2 rounded-md bg-board-soft p-4 text-board">
          <p className="font-bold">Check your email.</p>
          <p>If that account exists and has an email address, a link to choose a new password is on its way. It works for two hours.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Your username or email"><Input required autoFocus value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" /></Field>
          {ask.isError && <p className="text-sm text-marker">{errorText(ask.error)}</p>}
          <Button className="mt-2 w-full" busy={ask.isPending}>Email me a link</Button>
        </form>
      )}
      <p className="mt-4 text-sm text-ink-muted">No email on your account? Ask the school office to set a new password for you.</p>
      <p className="mt-2 text-center text-sm"><Link to="/login" className="font-bold text-pen">Back to sign in</Link></p>
    </AuthCard>
  );
}
