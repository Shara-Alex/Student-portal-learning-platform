import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { errorText } from "@/lib/api";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useAnnouncements, useDeleteAnnouncement, useSaveAnnouncement } from "../api";
import type { Announcement, Audience } from "../types";

/** One notice as a card. Also used on the home screen. */
export function NoticeCard({ notice, onClick }: { notice: Announcement; onClick?: () => void }) {
  return (
    <Card className={onClick ? "cursor-pointer hover:shadow-lift" : ""} onClick={onClick}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-bold">{notice.title}</h3>
        {notice.pinned && <Badge tone="wait">Pinned</Badge>}
        {notice.audience === "staff" && <Badge tone="info">Staff only</Badge>}
      </div>
      <p className="whitespace-pre-line">{notice.body}</p>
      <p className="mt-2 border-t border-dashed border-line pt-2 text-sm text-ink-muted">
        {notice.author_name && `${notice.author_name} · `}{new Date(notice.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        {notice.publish_until && ` · shows until ${notice.publish_until}`}
      </p>
    </Card>
  );
}

export function NoticesTab({ canEdit }: { canEdit: boolean }) {
  const [editing, setEditing] = useState<Announcement | null | undefined>(undefined);
  const notices = useAnnouncements();
  const rows = notices.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Notice board">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Post a notice</Button>}
      </PageHeader>
      {rows.map((n) => <NoticeCard key={n.id} notice={n} onClick={canEdit ? () => setEditing(n) : undefined} />)}
      {notices.isLoading && <Skeleton title={false} />}
      {!rows.length && !notices.isLoading && <Card className="text-ink-muted">No notices at the moment.</Card>}
      {editing !== undefined && <NoticeForm notice={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function NoticeForm({ notice, onClose }: { notice: Announcement | null; onClose: () => void }) {
  const save = useSaveAnnouncement();
  const remove = useDeleteAnnouncement();
  const [title, setTitle] = useState(notice?.title ?? "");
  const [body, setBody] = useState(notice?.body ?? "");
  const [audience, setAudience] = useState<Audience>(notice?.audience ?? "everyone");
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [until, setUntil] = useState(notice?.publish_until ?? "");
  const error = save.error ?? remove.error;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: notice?.id, data: { title, body, audience, pinned, publish_until: until || null } }, { onSuccess: onClose });
  }

  return (
    <Modal title={notice ? "Edit notice" : "Post a notice"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Title"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Message"><Textarea required rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Who sees it"><Select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}><option value="everyone">Everyone</option><option value="staff">Staff only</option></Select></Field>
          <Field label="Show until (optional)"><Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top</label>
        {error && <p className="text-sm text-marker">{errorText(error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {notice && <Button type="button" variant="danger" className="mr-auto" onClick={() => window.confirm("Delete this notice?") && remove.mutate(notice.id, { onSuccess: onClose })}>Delete</Button>}
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>{notice ? "Save" : "Post"}</Button>
        </div>
      </form>
    </Modal>
  );
}
