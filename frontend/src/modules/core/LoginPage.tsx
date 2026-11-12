import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "./api";
import { AuthCard } from "./AuthCard";

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
    <AuthCard title="Sign in">
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" /></Field>
        <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
        {error && <p className="text-sm text-marker">{error}</p>}
        <Button className="mt-2 w-full" busy={busy}>Sign in</Button>
        <p className="text-center text-sm"><Link to="/forgot-password" className="font-bold text-pen">Forgot your password?</Link></p>
      </form>
    </AuthCard>
  );
}
