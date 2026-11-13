import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { Presets } from "@/components/ui/presets";
import { Select } from "@/components/ui/select";
import { EmptyRow, Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { errorText } from "@/lib/api";
import { useSchoolTimeZone } from "@/lib/schoolDay";
import { useNotificationLog, useNotificationSettings, useSaveNotificationSettings, useSendPending } from "@/modules/notifications/api";
import { KINDS, STATUS, type NotificationSettings } from "@/modules/notifications/types";
import { Send, X } from "lucide-react";
import { useState } from "react";

/** The emails the system sends on its own, each with its own switch. */
const AUTOMATIC: { key: keyof NotificationSettings; label: string; help: string }[] = [
  { key: "absence", label: "Absences", help: "Email guardians when their child is marked absent." },
  { key: "payment", label: "Payment receipts", help: "Email guardians a receipt when a payment is recorded." },
  { key: "notice", label: "Notices", help: "Email new notices to the people they are for." },
];

/** Settings, Notifications (admins only): which emails go out by themselves, and a log of everything sent. */
export function NotificationsTab() {
  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" />
      <AutomaticEmails />
      <SentLog />
    </div>
  );
}

function AutomaticEmails() {
  const settings = useNotificationSettings();
  const save = useSaveNotificationSettings();
  return (
    <Card className="space-y-2">
      <h2 className="text-lg font-bold">Automatic emails</h2>
      {settings.isLoading && <Skeleton title={false} />}
      {settings.data && (
        <div className="divide-y divide-line">
          {AUTOMATIC.map((a) => (
            <div key={a.key} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-bold">{a.label}</p>
                <p className="text-sm text-ink-muted">{a.help}</p>
              </div>
              {/* Each switch saves at once. [a.key] sends only the one setting that changed. */}
              <Switch label={a.label} checked={settings.data[a.key]} disabled={save.isPending} onChange={(on) => save.mutate({ [a.key]: on })} />
            </div>
          ))}
        </div>
      )}
      {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
      <p className="text-sm text-ink-muted">Fee reminders are never automatic. They go out when someone presses Send reminders in Fees, Invoices.</p>
    </Card>
  );
}

const STATUS_CHIPS = [{ key: "", label: "All" }, ...Object.entries(STATUS).map(([key, s]) => ({ key, label: s.label }))];

/** Every email the school has sent or tried to send, newest first, with a button to send what is waiting. */
function SentLog() {
  const timeZone = useSchoolTimeZone();
  const [kind, setKind] = useState("");
  const [status, setStatus] = useState("");
  const [student, setStudent] = useState<{ id: number; name: string } | null>(null);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const log = useNotificationLog({ kind, status, student: student?.id, page });
  const sendPending = useSendPending();
  const rows = log.data?.results ?? [];
  const open = rows.find((n) => n.id === openId);

  // Changing a filter goes back to page 1, or we could ask for a page that no longer exists.
  const filter = <T,>(set: (value: T) => void) => (value: T) => { set(value); setPage(1); };
  // In the school's time zone, like the footer clock, so every admin reads the same time.
  const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const result = sendPending.data;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold">Sent messages</h2>
        <Button variant="default" busy={sendPending.isPending} onClick={() => sendPending.mutate()}>
          <Send size={16} /> Send waiting messages
        </Button>
      </div>
      <p className="text-sm text-ink-muted">Send waiting messages sends anything still waiting and tries the failed ones again.</p>
      {result && (
        <p className={result.failed ? "text-sm text-marker" : "text-sm text-board"}>
          {result.sent + result.failed === 0 ? "Nothing was waiting." : `${result.sent} sent${result.failed ? `, ${result.failed} failed. Open a failed message to see why.` : "."}`}
        </p>
      )}
      {sendPending.isError && <p className="text-sm text-marker">{errorText(sendPending.error)}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-44" aria-label="Kind" value={kind} onChange={(e) => filter(setKind)(e.target.value)}>
          <option value="">Every kind</option>
          {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
        </Select>
        <Presets label="Status" value={status} onChange={filter(setStatus)} options={STATUS_CHIPS} />
        {student && (
          <button type="button" onClick={() => filter(setStudent)(null)} aria-label={`Stop showing only ${student.name}`}
            className="flex cursor-pointer items-center gap-1 rounded-full border border-board bg-board-soft px-3 py-1 text-sm font-bold text-board">
            Only {student.name} <X size={14} />
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead><tr><th>When</th><th>Kind</th><th>To</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((n) => (
              <tr key={n.id} className="cursor-pointer" onClick={() => setOpenId(n.id)}>
                <td className="whitespace-nowrap font-mono text-sm text-ink-muted">{when(n.sent_at ?? n.created_at)}</td>
                <td>{n.kind_label}</td>
                <td>
                  {n.recipient_name || n.to}
                  {n.recipient_name && <span className="block text-sm font-normal text-ink-muted">{n.to}</span>}
                </td>
                <td>
                  {n.subject}
                  {n.student_name && <span className="block text-sm font-normal text-ink-muted">{n.student_name}</span>}
                </td>
                <td>
                  <Badge tone={STATUS[n.status].tone}>{STATUS[n.status].label}</Badge>
                  {n.status === "failed" && <span className="block text-sm text-ink-muted">{n.attempts} attempt(s)</span>}
                </td>
              </tr>
            ))}
            {!rows.length && <EmptyRow query={log} colSpan={5}>No messages match.</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager data={log.data} page={page} onPage={setPage} noun="message" />

      {open && (
        <Modal title={open.subject} onClose={() => setOpenId(null)}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-muted">To</dt>
            <dd>{open.recipient_name ? `${open.recipient_name} (${open.to})` : open.to}</dd>
            <dt className="text-ink-muted">Kind</dt>
            <dd>{open.kind_label}</dd>
            <dt className="text-ink-muted">Status</dt>
            <dd>
              <Badge tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Badge>{" "}
              {open.sent_at ? `on ${when(open.sent_at)}` : `${open.attempts} attempt(s)`}
            </dd>
          </dl>
          {open.error && <p className="mt-3 rounded-md bg-marker-soft px-3 py-2 text-sm text-marker">{open.error}</p>}
          {/* whitespace-pre-wrap keeps the email's own line breaks. */}
          <p className="mt-3 whitespace-pre-wrap rounded-md bg-sunken p-3 text-sm">{open.body}</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {open.student && (
              <Button variant="ghost" className="mr-auto" onClick={() => { filter(setStudent)({ id: open.student!, name: open.student_name }); setOpenId(null); }}>
                Everything about {open.student_name}
              </Button>
            )}
            <Button variant="default" onClick={() => setOpenId(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
