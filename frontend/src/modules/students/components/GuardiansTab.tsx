import { EmptyRow } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText } from "@/lib/api";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useDeleteGuardian, useGuardians } from "../api";
import type { Guardian } from "../types";
import { GuardianForm } from "./GuardianForm";

export function GuardiansTab({ canEdit }: { canEdit: boolean }) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Guardian | null | undefined>(undefined);
  const guardians = useGuardians(search);
  const remove = useDeleteGuardian();
  const rows = guardians.data?.results ?? [];

  function onDelete(g: Guardian) {
    if (window.confirm(`Delete ${g.full_name}? They will be unlinked from their children.`)) remove.mutate(g.id);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Guardians">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add guardian</Button>}
      </PageHeader>
      <div className="flex items-center gap-2">
        <Input className="max-w-xs" placeholder="Search name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Name</th>
              <th>Relationship</th>
              <th>Phone</th>
              <th>Email</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id}>
                <td><div className="who"><Avatar name={g.full_name} />{g.full_name}</div></td>
                <td className="capitalize">{g.relationship}</td>
                <td>{g.phone || "—"}</td>
                <td>{g.email || "—"}</td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => setEditing(g)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${g.full_name}`} onClick={() => onDelete(g)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && <EmptyRow query={guardians} colSpan={5}>No guardians found.</EmptyRow>}
          </tbody>
        </table>
      </div>
      {(guardians.data?.count ?? 0) > rows.length && (
        <p className="text-sm text-ink-muted">Showing the first {rows.length} of {guardians.data?.count}. Search to narrow the list.</p>
      )}
      {editing !== undefined && <GuardianForm guardian={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
