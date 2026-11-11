import type { Section } from "@/lib/sections";

/** The Academics app's menu in the top bar. The first one a user may see is where they land. */
export const sections: Section[] = [
  { key: "mine", label: "My timetable", roles: ["teacher"] },
  { key: "timetable", label: "Class timetables" },
  { key: "assignments", label: "Who teaches what" },
  { key: "subjects", label: "Subjects" },
  { key: "periods", label: "Periods" },
];
