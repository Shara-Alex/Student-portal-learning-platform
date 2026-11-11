// Mirrors backend/apps/assessments/serializers.py and services.py. Keep them in sync.
import type { SubjectGroup } from "@/modules/academics/types";

export type Category = "coursework" | "exam";

export interface Assessment {
  id: number;
  assignment: number;
  term: number;
  name: string;
  category: Category;
  date: string;
  total_marks: number;
  subject_name: string;
  subject_group: SubjectGroup;
  school_class_name: string;
  has_paper: boolean;
  has_marking_scheme: boolean;
  marked_count: number;
}

/** The figures a set of marks boils down to. null = nothing marked yet (not zero). */
export interface Result {
  coursework: number | null;
  exam: number | null;
  final: number | null;
  grade: string;
  remark: string;
  passed: boolean | null;
}

export interface MarkbookRow extends Result {
  student: number;
  admission_number: string;
  full_name: string;
  marks: Record<string, number | null>; // assessment id -> score
  comment: string;
}

export interface Markbook {
  assignment: { id: number; subject_name: string; subject_group: SubjectGroup; school_class_name: string; teacher: number; teacher_name: string };
  coursework_weight: number;
  pass_mark: number;
  assessments: Assessment[];
  rows: MarkbookRow[];
}

export interface GradeBand {
  id: number;
  symbol: string;
  min_percent: number;
  remark: string;
}
export type GradeBandInput = Omit<GradeBand, "id">;

export interface GradingSettings {
  coursework_weight: number;
  exam_weight: number;
  pass_mark: number;
}

export interface SubjectResult extends Result {
  subject_id: number;
  subject: string;
  group: SubjectGroup;
  teacher: string;
  // Only on a report card:
  position?: number | null;
  out_of?: number | null;
  comment?: string;
}

interface TermRef { id: number; name: string; year: string }
interface StudentRef { id: number; full_name: string; admission_number: string }

export interface ReportCard {
  student: StudentRef;
  term: TermRef;
  school_class: string;
  class_teacher: string;
  coursework_weight: number;
  pass_mark: number;
  subjects: SubjectResult[];
  average: number | null;
  grade: string;
}

export interface Transcript {
  student: StudentRef;
  terms: { term: TermRef; subjects: SubjectResult[]; average: number | null; grade: string }[];
}

export interface ClassResult {
  student: number;
  admission_number: string;
  full_name: string;
  subjects: number;
  average: number | null;
  grade: string;
}
