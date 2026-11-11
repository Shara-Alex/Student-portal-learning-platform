import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { errorText } from "@/lib/api";
import { Download } from "lucide-react";
import { useState, type FormEvent } from "react";
import { downloadFile, useDeleteAssessment, useSaveAssessment } from "../api";
import type { Assessment, Category } from "../types";

interface Props {
  assessment: Assessment | null; // null = set a new one
  assignment: number;
  term: number;
  canEdit: boolean;
  onClose: () => void;
}

/** Set or change a test or exam, and attach its question paper and marking scheme. */
export function AssessmentForm({ assessment, assignment, term, canEdit, onClose }: Props) {
  const save = useSaveAssessment();
  const remove = useDeleteAssessment();
  const [name, setName] = useState(assessment?.name ?? "");
  const [category, setCategory] = useState<Category>(assessment?.category ?? "coursework");
  const [date, setDate] = useState(assessment?.date ?? new Date().toISOString().slice(0, 10));
  const [total, setTotal] = useState(String(assessment?.total_marks ?? 50));
  const [paper, setPaper] = useState<File | null>(null);
  const [scheme, setScheme] = useState<File | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const error = save.error ?? remove.error;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    // FormData is how a browser sends files. Text fields go in alongside them.
    const data = new FormData();
    data.set("assignment", String(assignment));
    data.set("term", String(term));
    data.set("name", name);
    data.set("category", category);
    data.set("date", date);
    data.set("total_marks", total);
    if (paper) data.set("paper", paper);
    if (scheme) data.set("marking_scheme", scheme);
    save.mutate({ id: assessment?.id, data }, { onSuccess: onClose });
  }

  function onDelete() {
    if (assessment && window.confirm(`Delete ${assessment.name}? The ${assessment.marked_count} mark(s) entered for it will be deleted too.`)) {
      remove.mutate(assessment.id, { onSuccess: onClose });
    }
  }

  const fileRow = (label: string, kind: "paper" | "marking_scheme", has: boolean, onPick: (file: File | null) => void) => (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {canEdit && <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="min-w-0 flex-1 text-sm" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />}
        {has && assessment && (
          <Button type="button" variant="default" onClick={() => downloadFile(assessment.id, kind).catch((err) => setDownloadError(errorText(err)))}>
            <Download size={16} /> Download
          </Button>
        )}
        {!has && !canEdit && <span className="text-sm text-ink-muted">None uploaded</span>}
      </div>
    </Field>
  );

  return (
    <Modal title={assessment ? assessment.name : "Add assessment"} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <fieldset disabled={!canEdit} className="space-y-3">
          <Field label="Name"><Input required placeholder="Test 1" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Counts as">
              <Select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
                <option value="coursework">Coursework</option>
                <option value="exam">Exam</option>
              </Select>
            </Field>
            <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
            <Field label="Marked out of"><Input type="number" min={1} required value={total} onChange={(e) => setTotal(e.target.value)} /></Field>
          </div>
        </fieldset>
        {/* The dashed line is Homeroom's "ruled line" divider. */}
        <div className="space-y-3 border-t border-dashed border-line pt-3">
          {fileRow("Question paper", "paper", !!assessment?.has_paper, setPaper)}
          {fileRow("Marking scheme (staff only)", "marking_scheme", !!assessment?.has_marking_scheme, setScheme)}
          {canEdit && <p className="text-sm text-ink-muted">PDF, Word or image, up to 10 MB. Choosing a new file replaces the old one.</p>}
        </div>
        {(error || downloadError) && <p className="text-sm text-marker">{error ? errorText(error) : downloadError}</p>}
        <div className="flex justify-end gap-2 pt-2">
          {assessment && canEdit && <Button type="button" variant="danger" className="mr-auto" onClick={onDelete}>Delete</Button>}
          <Button type="button" variant="default" onClick={onClose}>{canEdit ? "Cancel" : "Close"}</Button>
          {canEdit && <Button disabled={save.isPending}>{save.isPending ? "Saving…" : "Save"}</Button>}
        </div>
      </form>
    </Modal>
  );
}
