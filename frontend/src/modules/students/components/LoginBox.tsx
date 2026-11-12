import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/api";
import { useState } from "react";
import { useCreateLogin } from "../api";

interface Props {
  kind: "guardians" | "students";
  id: number;
  username: string; // "" = no login yet
  who: string;      // "guardian" or "student", for the wording
}

/** Shows a person's portal login, or lets an admin create one. It is not a <form>, so it can sit inside other forms. */
export function LoginBox({ kind, id, username, who }: Props) {
  const create = useCreateLogin(kind);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const current = create.data?.username || username;

  return (
    <div className="mt-4 space-y-2 border-t border-dashed border-line pt-3">
      <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Portal login</p>
      {current ? (
        <p className="text-sm">This {who} signs in as <span className="font-mono font-semibold">{current}</span>.</p>
      ) : (
        <>
          <p className="text-sm text-ink-muted">Give this {who} a username and password so they can sign in and see their own records.</p>
          <div className="flex flex-wrap gap-2">
            <Input className="min-w-0 flex-1" placeholder="Username" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
            <Input className="min-w-0 flex-1" type="password" placeholder="Password (8 or more characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <Button type="button" variant="default" disabled={create.isPending || !name || !password} onClick={() => create.mutate({ id, username: name, password })}>
              Create login
            </Button>
          </div>
          {create.isError && <p className="text-sm text-marker">{errorText(create.error)}</p>}
        </>
      )}
    </div>
  );
}
