import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubjectTag } from "@/components/ui/subject-tag";
import { ArrowLeft, Printer } from "lucide-react";
import { useState } from "react";
import { useReportCard, useTranscript } from "../api";
import type { SubjectResult } from "../types";

const pct = (value: number | null) => (value === null ? "—" : `${value}%`);

/** One student's report card for a term, with a switch to their full transcript. Prints cleanly. */
export function ReportCardView({ student, term, onBack }: { student: number; term: string; onBack?: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const report = useReportCard(student, term, !!term);
  const transcript = useTranscript(student, showTranscript);
  const data = report.data;

  return (
    <div className="space-y-4">
      {/* print:hidden = leave these buttons off the printed page */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {onBack && <Button variant="default" onClick={onBack}><ArrowLeft size={16} /> All students</Button>}
        <Button variant="default" className="ml-auto" onClick={() => setShowTranscript(!showTranscript)}>
          {showTranscript ? "Show this term's report" : "Show full transcript"}
        </Button>
        <Button onClick={() => window.print()}><Printer size={16} /> Print</Button>
      </div>

      {data && (
        <Card className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold">{data.student.full_name}</h1>
            <p className="text-ink-muted">
              <span className="font-mono">{data.student.admission_number}</span>
              {data.school_class && ` · ${data.school_class}`}
              {data.class_teacher && ` · Class teacher: ${data.class_teacher}`}
            </p>
            <p className="text-sm font-extrabold uppercase tracking-wider text-ink-muted">
              {showTranscript ? "Transcript" : `Report card · ${data.term.name} ${data.term.year}`}
            </p>
          </div>
          {!showTranscript && (
            <div className="text-right">
              <p className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Average</p>
              <p className="font-mono text-[28px] leading-[34px] font-semibold">{pct(data.average)} {data.grade}</p>
            </div>
          )}
        </Card>
      )}

      {!showTranscript && data && (
        <>
          {data.subjects.map((s) => <SubjectBlock key={s.subject_id} result={s} />)}
          {!data.subjects.length && <Card className="text-ink-muted">No marks have been entered for this term yet.</Card>}
          <p className="text-sm text-ink-muted">
            Term mark = coursework × {data.coursework_weight}% + exam × {100 - data.coursework_weight}%. Pass mark {data.pass_mark}%.
          </p>
        </>
      )}

      {showTranscript && transcript.data?.terms.map((t) => (
        <div key={t.term.id} className="space-y-2">
          <h2 className="text-lg font-bold">{t.term.name} {t.term.year} <span className="font-mono font-medium text-ink-muted">· average {pct(t.average)} {t.grade}</span></h2>
          <table className="hr-list">
            <thead>
              <tr><th>Subject</th><th className="num">Coursework</th><th className="num">Exam</th><th className="num">Term mark</th><th className="num">Grade</th></tr>
            </thead>
            <tbody>
              {t.subjects.map((s) => (
                <tr key={s.subject_id}>
                  <td><SubjectTag group={s.group}>{s.subject}</SubjectTag></td>
                  <td className="num">{pct(s.coursework)}</td>
                  <td className="num">{pct(s.exam)}</td>
                  <td className="num">{pct(s.final)}</td>
                  <td className="num font-bold">{s.grade || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {showTranscript && transcript.data && !transcript.data.terms.length && <Card className="text-ink-muted">No marks on record yet.</Card>}
    </div>
  );
}

/** One subject on the report (Homeroom's ReportComment): result on the right, the teacher's comment in handwriting. */
function SubjectBlock({ result }: { result: SubjectResult }) {
  return (
    <div className="hr-report break-inside-avoid">
      <div className="subj">
        <SubjectTag group={result.group}>{result.subject}</SubjectTag>
        {result.passed !== null && <Badge tone={result.passed ? "good" : "bad"}>{result.passed ? "Passed" : "Below pass mark"}</Badge>}
      </div>
      <div className="grade">{pct(result.final)} <span className="text-ink-muted">{result.grade}</span></div>
      {result.comment
        ? <div className="comment">{result.comment}</div>
        : <div className="text-sm text-ink-muted print:invisible">No comment written yet.</div>}
      <div className="by">
        {result.teacher}
        {result.position && ` · Class position ${result.position} of ${result.out_of}`}
        {` · Coursework ${pct(result.coursework)} · Exam ${pct(result.exam)}`}
        {result.remark && ` · ${result.remark}`}
      </div>
    </div>
  );
}
