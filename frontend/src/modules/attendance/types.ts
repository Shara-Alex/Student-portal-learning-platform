// Mirrors backend/apps/attendance/views.py. Keep them in sync.
export type Mark = "P" | "L" | "A"; // Present, Late, Absent

export interface RegisterRow {
  student: number;
  full_name: string;
  status: Mark;
  note: string;
}

export interface Register {
  school_class: number;
  school_class_name: string;
  date: string;
  submitted: boolean; // has this day's register been saved before?
  can_mark: boolean;  // may this user change it?
  rows: RegisterRow[];
}

export interface Tally {
  present: number;
  late: number;
  absent: number;
  days: number;
  percent: number | null; // null = no registers yet
}

export interface SummaryRow extends Tally {
  student: number;
  full_name: string;
}

export interface StudentAttendance extends Tally {
  recent: { date: string; status: Mark; note: string }[];
}

/** A register this user is responsible for, and whether it has been done today. */
export interface MyRegister {
  school_class: number;
  name: string;
  students: number;
  submitted: boolean;
}
