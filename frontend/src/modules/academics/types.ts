// Mirrors backend/apps/academics/serializers.py. Keep them in sync.
/** Six subject groups. Each has one colour, the same on the timetable, markbook and reports. */
export type SubjectGroup = "maths" | "english" | "science" | "humanities" | "languages" | "practical";
export const SUBJECT_GROUPS: { value: SubjectGroup; label: string }[] = [
  { value: "maths", label: "Mathematics" },
  { value: "english", label: "English and literature" },
  { value: "science", label: "Sciences" },
  { value: "humanities", label: "Humanities" },
  { value: "languages", label: "Languages" },
  { value: "practical", label: "Practical, PE, agriculture" },
];

export interface Subject {
  id: number;
  name: string;
  code: string;
  group: SubjectGroup;
}

/** "This teacher teaches this subject to this class this year." */
export interface TeachingAssignment {
  id: number;
  year: number;
  school_class: number;
  school_class_name: string;
  subject: number;
  subject_name: string;
  subject_code: string;
  subject_group: SubjectGroup;
  teacher: number;
  teacher_name: string;
}

export interface Period {
  id: number;
  name: string;
  start_time: string; // "07:30:00"
  end_time: string;
  is_break: boolean;
}

/** One lesson on the weekly timetable. day: 1 = Monday ... 5 = Friday. */
export interface TimetableEntry {
  id: number;
  assignment: number;
  day: number;
  period: number;
  room: string;
  subject_name: string;
  subject_code: string;
  subject_group: SubjectGroup;
  teacher_name: string;
  school_class: number;
  school_class_name: string;
}

export type SubjectInput = Omit<Subject, "id">;
export type PeriodInput = Omit<Period, "id">;
export type AssignmentInput = Pick<TeachingAssignment, "school_class" | "subject" | "teacher">;
export type TimetableInput = Pick<TimetableEntry, "assignment" | "day" | "period" | "room">;

export const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
];
