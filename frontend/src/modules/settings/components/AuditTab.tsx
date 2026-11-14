import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { Select } from "@/components/ui/select";
import { EmptyRow } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/roles";
import { useSchoolTimeZone } from "@/lib/schoolDay";
import { useAuditEntries } from "@/modules/audit/api";
import { ACTION_GROUPS, type Action, type AuditEntry } from "@/modules/audit/types";
import { X } from "lucide-react";
import { useState } from "react";

/** Deleting is red, adding is green, an edit is blue: the same colour code as the rest of the app. */
const TONE: Record<Action, Tone> = {
  mark_changed: "info",
  assessment_deleted: "bad",
  payment_recorded: "good",
  payment_deleted: "bad",
  invoice_deleted: "bad",
  user_created: "good",
  user_changed: "info",
  password_set: "wait",
  login_created: "good",
};

/** A "show only this" choice the admin made by clicking inside an entry. */
type Focus =
  | { kind: "student"; id: number; label: string }
  | { kind: "actor"; id: number; label: string }
  | { kind: "target"; type: string; id: number; label: string };

/**
 * Settings, Audit trail (admins only): who changed a mark, a payment or a login, and when.
 * Read-only on purpose. Nothing on this screen can change or remove an entry.
 */
export function AuditTab() {
  const timeZone = useSchoolTimeZone();
  const [action, setAction] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [focus, setFocus] = useState<Focus | null>(null);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);

  const entries = useAuditEntries({
    action, search, date_from: from, date_to: to, page,
    student: focus?.kind === "student" ? focus.id : undefined,
    actor: focus?.kind === "actor" ? focus.id : undefined,
    target_type: focus?.kind === "target" ? focus.type : undefined,
    target_id: focus?.kind === "target" ? focus.id : undefined,
  });
  const rows = entries.data?.results ?? [];
  const open = rows.find((e) => e.id === openId);

  // Changing a filter goes back to page 1, or we could ask for a page that no longer exists.
  const filter = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(1); };
  // In the school's time zone, like the footer clock, so every admin reads the same time.
  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const focusOn = (next: Focus) => { filter(setFocus)(next); setOpenId(null); };
  const filtered = action || search || from || to || focus;
  const clear = () => { setAction(""); setSearch(""); setFrom(""); setTo(""); setFocus(null); setPage(1); };

  return (
    <div className="space-y-3">
      <PageHeader title="Audit trail" />
      <p className="text-sm text-ink-muted">
        Every change to a mark, a payment or a login is written here as it happens. Entries cannot be edited or deleted, by anyone.
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <Select className="w-56" aria-label="What happened" value={action} onChange={(e) => filter(setAction)(e.target.value)}>
          <option value="">Everything</option>
          {ACTION_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.actions.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </optgroup>
          ))}
        </Select>
        <Input className="max-w-xs" placeholder="Search what changed, or who did it" value={search} onChange={(e) => filter(setSearch)(e.target.value)} />
        <label className="text-sm text-ink-muted">
          From <Input type="date" className="w-40" value={from} max={to || undefined} onChange={(e) => filter(setFrom)(e.target.value)} />
        </label>
        <label className="text-sm text-ink-muted">
          To <Input type="date" className="w-40" value={to} min={from || undefined} onChange={(e) => filter(setTo)(e.target.value)} />
        </label>
        {filtered && <Button variant="ghost" onClick={clear}>Clear filters</Button>}
      </div>
      {focus && (
        <button type="button" onClick={() => filter(setFocus)(null)} aria-label={`Stop showing only ${focus.label}`}
          className="flex cursor-pointer items-center gap-1 rounded-full border border-board bg-board-soft px-3 py-1 text-sm font-bold text-board">
          Only {focus.label} <X size={14} />
        </button>
      )}

      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead><tr><th>When</th><th>Who</th><th>What happened</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="cursor-pointer" onClick={() => setOpenId(e.id)}>
                <td className="whitespace-nowrap font-mono text-sm text-ink-muted">{when(e.at)}</td>
                <td>
                  {e.actor_name}
                  {e.actor_role && <span className="block text-sm font-normal text-ink-muted">{ROLE_LABELS[e.actor_role]}</span>}
                </td>
                <td><Badge tone={TONE[e.action] ?? "neutral"}>{e.action_label}</Badge></td>
                <td>
                  {e.summary}
                  {e.student_name && <span className="block text-sm font-normal text-ink-muted">{e.student_name}</span>}
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow query={entries} colSpan={4}>{filtered ? "No entries match." : "Nothing has been recorded yet."}</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager data={entries.data} page={page} onPage={setPage} noun="change" />

      {open && <EntryModal entry={open} when={when} onClose={() => setOpenId(null)} onFocus={focusOn} />}
    </div>
  );
}

/** One entry in full: the before and after of each field, and shortcuts to related entries. */
function EntryModal({ entry, when, onClose, onFocus }: {
  entry: AuditEntry;
  when: (iso: string) => string;
  onClose: () => void;
  onFocus: (focus: Focus) => void;
}) {
  const fields = Object.entries(entry.changes);
  return (
    <Modal title={entry.action_label} onClose={onClose}>
      <p className="font-bold">{entry.summary}</p>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-ink-muted">When</dt>
        <dd className="font-mono">{when(entry.at)}</dd>
        <dt className="text-ink-muted">Who</dt>
        <dd>{entry.actor_name}{entry.actor_role && ` (${ROLE_LABELS[entry.actor_role]})`}</dd>
        {entry.student_name && (<><dt className="text-ink-muted">Student</dt><dd>{entry.student_name}</dd></>)}
      </dl>

      {fields.length > 0 && (
        <table className="hr-list mt-3">
          <thead><tr><th>Field</th><th>Before</th><th>After</th></tr></thead>
          <tbody>
            {fields.map(([field, value]) => {
              // An edit is stored as [old, new]. Anything else is a plain detail of what was added or deleted.
              const pair = Array.isArray(value) && value.length === 2;
              return (
                <tr key={field}>
                  <td className="text-ink-muted">{label(field)}</td>
                  {pair
                    ? (<><td className="text-marker">{show(value[0], field)}</td><td className="text-board">{show(value[1], field)}</td></>)
                    : <td colSpan={2}>{show(value, field)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {entry.target_id !== null && (
          <Button variant="ghost" onClick={() => onFocus({ kind: "target", type: entry.target_type, id: entry.target_id!, label: `this ${label(entry.target_type).toLowerCase()}` })}>
            History of this {label(entry.target_type).toLowerCase()}
          </Button>
        )}
        {entry.student && (
          <Button variant="ghost" onClick={() => onFocus({ kind: "student", id: entry.student!, label: entry.student_name })}>
            Everything about {entry.student_name}
          </Button>
        )}
        {entry.actor && (
          <Button variant="ghost" onClick={() => onFocus({ kind: "actor", id: entry.actor!, label: `changes by ${entry.actor_name}` })}>
            Everything {entry.actor_name} did
          </Button>
        )}
        <Button variant="default" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
}

/** "total_marks" -> "Total marks" */
function label(field: string) {
  const words = field.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A stored value as a person would read it. Empty shows as a dash so a blank is not mistaken for missing. */
function show(value: unknown, field: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // A role is stored as its code ("front_office"); show the name people know it by.
  if (field === "role" && typeof value === "string" && value in ROLE_LABELS) return ROLE_LABELS[value as keyof typeof ROLE_LABELS];
  return String(value);
}
