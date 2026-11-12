import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SubjectTag } from "@/components/ui/subject-tag";
import { errorText } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAssignments } from "@/modules/academics/api";
import { useMe } from "@/modules/core/api";
import { Paperclip, Plus } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { useMarkbook, useSaveComment, useSaveMark } from "../api";
import type { Assessment, Markbook, MarkbookRow } from "../types";
import { AssessmentForm } from "./AssessmentForm";
import { TermPicker } from "@/components/TermPicker";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

/**
 * The teacher's mark sheet (Homeroom's Markbook): students down the side,
 * assessments across, typed straight into the grid like a spreadsheet.
 */
export function MarkbookTab() {
  const me = useMe();
  const isTeacher = me.data?.role === "teacher";
  // Teachers pick from the classes they teach; admins from every class.
  const assignments = useAssignments(isTeacher ? { teacher: "me" } : {}, !!me.data);
  const [chosen, setChosen] = useState("");
  const [term, setTerm] = useState("");
  const [editing, setEditing] = useState<Assessment | null | undefined>(undefined);

  const assignmentId = chosen || String(assignments.data?.[0]?.id ?? "");
  const assignment = assignments.data?.find((a) => String(a.id) === assignmentId);
  const book = useMarkbook(assignmentId, term);
  // Only the subject's own teacher (or an admin) may type in the grid.
  const canEdit = me.data?.role === "admin" || (!!assignment && assignment.teacher === me.data?.id);

  return (
    <div className="space-y-4">
      <PageHeader title="Markbook">
        {canEdit && term && <Button onClick={() => setEditing(null)}><Plus size={16} /> Add assessment</Button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-64" aria-label="Class and subject" value={assignmentId} onChange={(e) => setChosen(e.target.value)}>
          {!assignments.data?.length && <option value="">No classes to mark yet</option>}
          {assignments.data?.map((a) => <option key={a.id} value={a.id}>{a.school_class_name} · {a.subject_name}</option>)}
        </Select>
        <TermPicker value={term} onChange={setTerm} year={assignment?.year} />
        {assignment && <SubjectTag group={assignment.subject_group}>{assignment.subject_name}</SubjectTag>}
        {assignment && <span className="text-sm text-ink-muted">{assignment.teacher_name}</span>}
      </div>

      {!assignments.isLoading && !assignments.data?.length && (
        <Card className="text-ink-muted">
          {isTeacher ? "You have not been given any classes yet." : "Nothing to mark yet."} Classes and subjects are linked to teachers under Academics, Who teaches what.
        </Card>
      )}

      {book.isLoading && <Skeleton rows={5} title={false} />}
      {book.data && (
        <Grid book={book.data} term={Number(term)} canEdit={canEdit} onEditAssessment={setEditing} />
      )}

      {editing !== undefined && assignment && (
        <AssessmentForm assessment={editing} assignment={assignment.id} term={Number(term)} canEdit={canEdit} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}

interface GridProps {
  book: Markbook;
  term: number;
  canEdit: boolean;
  onEditAssessment: (a: Assessment) => void;
}

function Grid({ book, term, canEdit, onEditAssessment }: GridProps) {
  const saveMark = useSaveMark();
  const saveComment = useSaveComment();
  const error = saveMark.error ?? saveComment.error;

  if (!book.assessments.length) {
    return <Card className="text-ink-muted">No assessments this term yet.{canEdit && " Use Add assessment to set the first test."}</Card>;
  }
  if (!book.rows.length) {
    return <Card className="text-ink-muted">This class has no students yet. Place students in the class under Students.</Card>;
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="hr-markbook">
          <thead>
            <tr>
              <th>Student</th>
              {book.assessments.map((a) => (
                <th key={a.id}>
                  {/* The heading opens the assessment: its details, question paper and marking scheme. */}
                  <button type="button" className="cursor-pointer text-right uppercase hover:text-board" onClick={() => onEditAssessment(a)} title="Open this assessment">
                    {a.name} {(a.has_paper || a.has_marking_scheme) && <Paperclip size={11} className="inline" />}
                    <small>/{a.total_marks} · {a.category === "exam" ? "exam" : "coursework"}</small>
                  </button>
                </th>
              ))}
              <th>Coursework</th>
              <th>Exam</th>
              <th>Term mark</th>
              <th>Grade</th>
              <th className="!text-left">Comment for the report</th>
            </tr>
          </thead>
          <tbody>
            {book.rows.map((row, rowIndex) => (
              <tr key={row.student}>
                <td className="whitespace-nowrap">{row.full_name}</td>
                {book.assessments.map((a, colIndex) => (
                  <MarkCell
                    key={a.id}
                    assessment={a}
                    row={row}
                    passMark={book.pass_mark}
                    canEdit={canEdit}
                    position={`${rowIndex}-${colIndex}`}
                    below={`${rowIndex + 1}-${colIndex}`}
                    onSave={(score) => saveMark.mutate({ assessment: a.id, student: row.student, score })}
                  />
                ))}
                <td className="avg">{pct(row.coursework)}</td>
                <td className="avg">{pct(row.exam)}</td>
                <td className={cn("avg", row.passed === false && "fail")}>{pct(row.final)}</td>
                <td className="avg">{row.grade || "—"}</td>
                <td className="!p-0 !text-left !font-sans">
                  <CommentCell
                    row={row}
                    canEdit={canEdit}
                    onSave={(text) => saveComment.mutate({ student: row.student, assignment: book.assignment.id, term, text })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-sm text-marker">{errorText(error)}</p>}
      <p className="text-sm text-ink-muted">
        Term mark = coursework × {book.coursework_weight}% + exam × {100 - book.coursework_weight}%. Pass mark {book.pass_mark}%.
        {canEdit && " Type a mark and press Enter to move down to the next student. Marks save as you go."}
      </p>
    </div>
  );
}

interface MarkCellProps {
  assessment: Assessment;
  row: MarkbookRow;
  passMark: number;
  canEdit: boolean;
  position: string; // "row-column", so Enter can find the cell underneath
  below: string;
  onSave: (score: number | null) => void;
}

/** One cell of the grid: a number you can type over. Saves when you leave it. */
function MarkCell({ assessment, row, passMark, canEdit, position, below, onSave }: MarkCellProps) {
  const saved = row.marks[String(assessment.id)] ?? null;
  // While typing we keep our own copy of the text; null means "show the saved value".
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (saved === null ? "" : String(saved));
  const failing = saved !== null && (saved / assessment.total_marks) * 100 < passMark;

  function commit() {
    if (draft === null) return;
    const text = draft.trim();
    const score = text === "" ? null : Number(text);
    setDraft(null);
    // Not a number, or nothing changed: put the saved value back and do nothing.
    if (score !== null && Number.isNaN(score)) return;
    if (score !== saved) onSave(score);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      // Teachers enter one test at a time, so Enter goes DOWN to the next student.
      const next = document.querySelector<HTMLInputElement>(`[data-cell="${below}"]`);
      if (next) next.focus();
      else e.currentTarget.blur();
    }
    if (e.key === "Escape") {
      setDraft(null);
      e.currentTarget.blur();
    }
  }

  // Design rule: a failing mark is red TEXT, a missing mark is a yellow fill with a dash.
  const tone = draft !== null ? "edit" : saved === null ? "missing" : failing ? "fail" : "";
  if (!canEdit) return <td className={tone}>{saved ?? "—"}</td>;

  return (
    <td className={cn("!p-0", tone)}>
      <input
        data-cell={position}
        inputMode="decimal"
        aria-label={`${row.full_name}, ${assessment.name}, out of ${assessment.total_marks}`}
        className="w-full min-w-16 bg-transparent px-3 py-2 text-right font-mono text-inherit outline-none placeholder:text-bus-ink"
        placeholder="—"
        value={shown}
        onFocus={(e) => { setDraft(shown); e.currentTarget.select(); }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={onKeyDown}
      />
    </td>
  );
}

function CommentCell({ row, canEdit, onSave }: { row: MarkbookRow; canEdit: boolean; onSave: (text: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  if (!canEdit) return <span className="block px-3 py-2 text-ink-muted">{row.comment || "—"}</span>;
  return (
    <input
      aria-label={`Report comment for ${row.full_name}`}
      className="w-full min-w-64 bg-transparent px-3 py-2 outline-none focus:bg-pen-soft"
      placeholder="Write a comment…"
      maxLength={300}
      value={draft ?? row.comment}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== row.comment) onSave(draft);
        setDraft(null);
      }}
    />
  );
}
