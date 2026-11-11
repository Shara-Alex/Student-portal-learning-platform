import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input className="max-w-xs" placeholder="Search name, phone or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        {canEdit && <Button className="ml-auto" onClick={() => setEditing(null)}><Plus size={16} /> Add guardian</Button>}
      </div>
      {remove.isError && <p className="text-sm text-red-600">{errorText(remove.error)}</p>}
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Relationship</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              {canEdit && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((g) => (
              <tr key={g.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{g.full_name}</td>
                <td className="px-4 py-3 capitalize">{g.relationship}</td>
                <td className="px-4 py-3">{g.phone || "—"}</td>
                <td className="px-4 py-3">{g.email || "—"}</td>
                {canEdit && (
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => setEditing(g)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete ${g.full_name}`} onClick={() => onDelete(g)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
            {!rows.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{guardians.isLoading ? "Loading…" : "No guardians found."}</td></tr>
            )}
          </tbody>
        </table>
      </Card>
      {(guardians.data?.count ?? 0) > rows.length && (
        <p className="text-sm text-slate-500">Showing the first {rows.length} of {guardians.data?.count}. Search to narrow the list.</p>
      )}
      {editing !== undefined && <GuardianForm guardian={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}
