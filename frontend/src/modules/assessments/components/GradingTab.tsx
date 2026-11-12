import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { errorText } from "@/lib/api";
import { useMe } from "@/modules/core/api";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useBands, useDeleteBand, useGradingSettings, useSaveBand, useSaveGradingSettings } from "../api";
import type { GradeBand, GradingSettings } from "../types";

/** The school's marking rules: how coursework and exam combine, the pass mark, and the grade bands. */
export function GradingTab() {
  const me = useMe();
  const canEdit = me.data?.role === "admin";
  const settings = useGradingSettings();
  const bands = useBands();
  const remove = useDeleteBand();
  const [editing, setEditing] = useState<GradeBand | null | undefined>(undefined);
  const rows = bands.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Grading">
        {canEdit && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add grade</Button>}
      </PageHeader>

      {/* key: rebuild the form when the saved values arrive, so its boxes start from them */}
      {settings.data && <Weights key={JSON.stringify(settings.data)} settings={settings.data} canEdit={canEdit} />}

      <h2 className="pt-2 text-lg font-bold">Grade bands</h2>
      <p className="text-ink-muted">A mark gets the highest grade whose starting percentage it reaches.</p>
      {remove.isError && <p className="text-sm text-marker">{errorText(remove.error)}</p>}
      <div className="overflow-x-auto">
        <table className="hr-list">
          <thead>
            <tr>
              <th>Grade</th>
              <th className="num">From</th>
              <th>Remark</th>
              {canEdit && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td className="font-mono font-bold">{b.symbol}</td>
                <td className="num">{b.min_percent}%</td>
                <td>{b.remark || "—"}</td>
                {canEdit && (
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" onClick={() => setEditing(b)}>Edit</Button>
                    <Button variant="ghost" aria-label={`Delete grade ${b.symbol}`} onClick={() => window.confirm(`Delete grade ${b.symbol}?`) && remove.mutate(b.id)}><Trash2 size={16} /></Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing !== undefined && <BandForm band={editing} onClose={() => setEditing(undefined)} />}
    </div>
  );
}

function Weights({ settings, canEdit }: { settings: GradingSettings; canEdit: boolean }) {
  const save = useSaveGradingSettings();
  const [coursework, setCoursework] = useState(String(settings.coursework_weight));
  const [passMark, setPassMark] = useState(String(settings.pass_mark));
  const exam = 100 - (Number(coursework) || 0);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ coursework_weight: Number(coursework), pass_mark: Number(passMark) });
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-4">
        <fieldset disabled={!canEdit} className="flex flex-wrap items-end gap-4">
          <div className="w-40"><Field label="Coursework counts (%)"><Input type="number" min={0} max={100} required value={coursework} onChange={(e) => setCoursework(e.target.value)} /></Field></div>
          <div className="w-40"><Field label="Exam counts (%)"><Input disabled value={exam} /></Field></div>
          <div className="w-40"><Field label="Pass mark (%)"><Input type="number" min={0} max={100} required value={passMark} onChange={(e) => setPassMark(e.target.value)} /></Field></div>
        </fieldset>
        {canEdit && <Button variant="default" busy={save.isPending}>Save rules</Button>}
        {save.isSuccess && <span className="text-sm text-board">Saved. Every result has been recalculated.</span>}
        {save.isError && <span className="text-sm text-marker">{errorText(save.error)}</span>}
      </form>
    </Card>
  );
}

function BandForm({ band, onClose }: { band: GradeBand | null; onClose: () => void }) {
  const save = useSaveBand();
  const [symbol, setSymbol] = useState(band?.symbol ?? "");
  const [from, setFrom] = useState(band ? String(band.min_percent) : "");
  const [remark, setRemark] = useState(band?.remark ?? "");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate({ id: band?.id, data: { symbol, min_percent: Number(from), remark } }, { onSuccess: onClose });
  }

  return (
    <Modal title={band ? `Edit grade ${band.symbol}` : "Add grade"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Grade"><Input required placeholder="A" maxLength={5} value={symbol} onChange={(e) => setSymbol(e.target.value)} /></Field>
          <Field label="Starts at (%)"><Input type="number" min={0} max={100} step="0.01" required value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        </div>
        <Field label="Remark"><Input placeholder="Excellent" value={remark} onChange={(e) => setRemark(e.target.value)} /></Field>
        {save.isError && <p className="text-sm text-marker">{errorText(save.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="default" onClick={onClose}>Cancel</Button>
          <Button busy={save.isPending}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
