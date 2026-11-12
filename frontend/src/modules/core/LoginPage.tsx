import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GraduationCap } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "./api";

export function LoginPage() {
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username, password);
      nav("/");
    } catch {
      setError("Wrong username or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {/* The inset yellow line is Homeroom's signature stripe. */}
      <div className="w-full max-w-sm overflow-hidden rounded-lg bg-raised p-6 shadow-lift [box-shadow:inset_0_3px_0_var(--bus),var(--shadow-lift)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-board text-on-board"><GraduationCap size={24} /></div>
          <div>
            <h1 className="text-lg font-extrabold">Sign in</h1>
            <p className="text-sm text-ink-muted">School portal</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
          {error && <p className="text-sm text-marker">{error}</p>}
          <Button className="mt-2 w-full" busy={busy}>Sign in</Button>
        </form>
      </div>
    </div>
  );
}
