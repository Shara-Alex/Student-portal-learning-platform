// Mirrors backend/apps/admissions/serializers.py. Keep them in sync.
import type { Gender, Relationship } from "@/modules/students/types";

export type Stage = "applied" | "interview" | "offered" | "enrolled" | "declined";

/** What a family fills in on the public form. */
export interface ApplicationForm {
  first_name: string;
  last_name: string;
  gender: Gender;
  date_of_birth: string;
  applying_for: string;
  previous_school: string;
  reason_for_transfer: string;
  medical_notes: string;
  guardian_first_name: string;
  guardian_last_name: string;
  guardian_relationship: Relationship;
  guardian_phone: string;
  guardian_email: string;
}

export interface Application extends ApplicationForm {
  id: number;
  full_name: string;
  guardian_name: string;
  has_document: boolean;
  status: Stage;
  notes: string;
  student: number | null;
  created_at: string;
}

/** The workflow, in order. "Declined" sits outside it. */
export const STAGES: { value: Stage; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offered", label: "Offered" },
  { value: "enrolled", label: "Enrolled" },
];
