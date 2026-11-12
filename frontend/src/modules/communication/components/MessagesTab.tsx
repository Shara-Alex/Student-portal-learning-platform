import { EmptyRow } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pager } from "@/components/ui/pager";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PenLine, Reply } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useMessages, useOpenMessage, useRecipients, useSendMessage } from "../api";
import type { Message, Recipient } from "../types";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** What the compose window starts with: nothing, or a reply to a message. */
interface Draft { to?: Recipient; subject?: string; replyTo?: number }

export function MessagesTab({ box }: { box: "inbox" | "sent" }) {
  const [page, setPage] = useState(1);
  const messages = useMessages(box, page);
  const [openId, setOpenId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const rows = messages.data?.results ?? [];
  const inbox = box === "inbox";

  return (
    <div className="space-y-4">
      <PageHeader title={inbox ? "Inbox" : "Sent"}>
        <Button onClick={() => setDraft({})}><PenLine size={16} /> New message</Button>
      </PageHeader>
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead><tr><th>{inbox ? "From" : "To"}</th><th>Subject</th><th className="w-40">Sent</th></tr></thead>
          <tbody>
            {rows.map((m) => {
              const unread = inbox && !m.is_read;
              const person = inbox ? m.sender_name : m.recipient_name;
              return (
                <tr key={m.id} className="cursor-pointer" onClick={() => setOpenId(m.id)}>
                  <td><div className={cn("who", !unread && "!font-normal")}><Avatar name={person} />{person}</div></td>
                  <td className={cn(unread && "font-bold")}>{m.subject} {unread && <Badge tone="info">New</Badge>}</td>
                  <td className="font-mono text-sm text-ink-muted">{when(m.created_at)}</td>
                </tr>
              );
            })}
            {!rows.length && <EmptyRow query={messages} colSpan={3}>{inbox ? "No messages yet." : "You have not sent any messages."}</EmptyRow>}
          </tbody>
        </table>
      </div>
      <Pager data={messages.data} page={page} onPage={setPage} noun="message" />
      {openId !== null && (
        <MessageView
          id={openId}
          onClose={() => setOpenId(null)}
          onReply={(m) => { setOpenId(null); setDraft({ to: { id: m.sender, name: m.sender_name, role: "" }, subject: m.subject.startsWith("Re: ") ? m.subject : `Re: ${m.subject}`, replyTo: m.id }); }}
          canReply={inbox}
        />
      )}
      {draft && <Compose draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

function MessageView({ id, onClose, onReply, canReply }: { id: number; onClose: () => void; onReply: (m: Message) => void; canReply: boolean }) {
  const message = useOpenMessage(id).data;
  return (
    <Modal title={message?.subject ?? "Message"} onClose={onClose}>
      {message && (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">From <b className="text-ink">{message.sender_name}</b> to <b className="text-ink">{message.recipient_name}</b> · {when(message.created_at)}</p>
          <p className="whitespace-pre-line border-t border-dashed border-line pt-3">{message.body}</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="default" onClick={onClose}>Close</Button>
            {canReply && <Button onClick={() => onReply(message)}><Reply size={16} /> Reply</Button>}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Compose({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const send = useSendMessage();
  const [to, setTo] = useState<Recipient | null>(draft.to ?? null);
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState(draft.subject ?? "");
  const [body, setBody] = useState("");
  const people = useRecipients(search);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!to) return;
    send.mutate({ recipient: to.id, subject, body, reply_to: draft.replyTo ?? null }, { onSuccess: onClose });
  }

  return (
    <Modal title={draft.replyTo ? "Reply" : "New message"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="To">
          {to ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-board-soft px-3 py-1 text-sm font-bold text-board">{to.name}</span>
              {!draft.replyTo && <Button type="button" variant="ghost" onClick={() => setTo(null)}>Change</Button>}
            </div>
          ) : (
            <>
              <Input placeholder="Search by name…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
              <div className="mt-1 max-h-44 overflow-y-auto rounded-sm border border-line">
                {people.data?.map((p) => (
                  <button type="button" key={p.id} onClick={() => setTo(p)} className="flex w-full justify-between px-3 py-2 text-left hover:bg-sunken">
                    <span>{p.name}</span><span className="text-sm capitalize text-ink-muted">{p.role}</span>
                  </button>
                ))}
                {people.data?.length === 0 && <p className="px-3 py-2 text-sm text-ink-muted">Nobody found.</p>}
              </div>
            </>
          )}
        </Field>
        <Field label="Subject"><Input required maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><Textarea required rows={6} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        {send.isError && <p className="text-sm text-marker">{errorText(send.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={send.isPending} disabled={!to}>Send</Button>
        </div>
      </form>
    </Modal>
  );
}
