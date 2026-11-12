import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { Select } from "@/components/ui/select";
import { EmptyRow } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/roles";
import { useMe } from "@/modules/core/api";
import type { Role } from "@/modules/core/types";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useUsers } from "../api";
import { UserForm } from "./UserForm";

const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Everyone who can sign in. Staff are added here; family logins are made from the guardian's or student's record. */
export function UsersTab() {
  const me = useMe();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("true");
  const [page, setPage] = useState(1);
  // null = form closed, "new" = adding, a number = editing that user
  const [openId, setOpenId] = useState<number | "new" | null>(null);

  const users = useUsers({ search, role, is_active: active, page });
  const rows = users.data?.results ?? [];
  // Look the open user up in the fresh list each time, so the form always shows what is saved.
  const open = rows.find((u) => u.id === openId);

  // Changing a filter must send us back to page 1, or we could ask for a page that no longer exists.
  const filter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Users">
        <Button onClick={() => setOpenId("new")}><Plus size={16} /> Add user</Button>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-2">
        <Input className="max-w-xs" placeholder="Search name or username" value={search} onChange={(e) => filter(setSearch)(e.target.value)} />
        <Select className="w-44" aria-label="Role" value={role} onChange={(e) => filter(setRole)(e.target.value)}>
          <option value="">Every role</option>
          {(Object.keys(ROLE_LABELS) as Role[]).map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </Select>
        <Select className="w-40" aria-label="Status" value={active} onChange={(e) => filter(setActive)(e.target.value)}>
          <option value="true">Active</option>
          <option value="false">Deactivated</option>
          <option value="">Everyone</option>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr><th>Name</th><th>Username</th><th>Role</th><th>Last signed in</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="cursor-pointer" onClick={() => setOpenId(u.id)}>
                <td>
                  <div className="who">
                    <Avatar name={u.full_name || u.username} />
                    <span>
                      {u.full_name || u.username}
                      {u.linked_to && <span className="block text-sm font-normal text-ink-muted">{u.linked_to}</span>}
                    </span>
                  </div>
                </td>
                <td className="font-mono">{u.username}</td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td className="font-mono text-sm text-ink-muted">{u.last_login ? day(u.last_login) : "Never"}</td>
                <td><Badge tone={u.is_active ? "good" : "neutral"}>{u.is_active ? "Active" : "Deactivated"}</Badge></td>
              </tr>
            ))}
            {!rows.length && <EmptyRow query={users} colSpan={5}>No users match.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager data={users.data} page={page} onPage={setPage} noun="user" />

      {openId === "new" && <UserForm user={null} isSelf={false} onClose={() => setOpenId(null)} />}
      {/* key: a different user is a different form, so nothing typed for the last one lingers */}
      {open && <UserForm key={open.id} user={open} isSelf={open.id === me.data?.id} onClose={() => setOpenId(null)} />}
    </div>
  );
}
