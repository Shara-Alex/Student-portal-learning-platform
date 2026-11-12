// Mirrors backend/apps/students/serializers.py. Keep them in sync.
export interface SchoolClass {
  id: number;
  name: string;
  level: number;
  class_teacher: number | null;
  class_teacher_name: string;
  student_count: number;
}

export type Relationship = "mother" | "father" | "guardian" | "other";

export interface Guardian {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  relationship: Relationship;
  phone: string;
  email: string;
  address: string;
  username: string; // their portal login, or "" if they have none
}

export type Gender = "M" | "F";
export type StudentStatus = "active" | "left" | "graduated";
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export interface Student {
  id: number;
  admission_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: Gender;
  date_of_birth: string | null;
  admission_date: string;
  status: StudentStatus;
  address: string;
  blood_group: string;            // "" when not recorded
  allergies: string;
  medical_notes: string;
  guardians: number[];            // ids (this is what we send back when saving)
  guardian_details: Guardian[];   // full records, read-only
  current_class: number | null;
  current_class_name: string;
  username: string; // the student's own portal login, or ""
}

/** What we send when saving a student. `school_class` sets the class for the current year. */
export type StudentInput = Omit<Student, "id" | "full_name" | "guardian_details" | "current_class" | "current_class_name" | "username"> & {
  school_class: number | null;
};
export type GuardianInput = Omit<Guardian, "id" | "full_name" | "username">;
export type SchoolClassInput = Pick<SchoolClass, "name" | "level" | "class_teacher">;

/** Year-end promotion of one class. to_class = null means "leaving school" (graduated). */
export interface PromoteInput {
  from_class: number;
  to_year: number;
  to_class: number | null;
  students: number[];
}
