import type { Filters } from "@/modules/academics/api";
import { useMe } from "@/modules/core/api";
import { useStudents } from "@/modules/students/api";

/**
 * Whose lessons the shell shows in "Right now" and the footer:
 * a teacher's own, or a student's class. Everyone else gets null, meaning "just the period".
 */
export function useMyDay(): Filters | null {
  const role = useMe().data?.role;
  // A student's own record, to know their class. Nobody else asks for it.
  const self = useStudents({}, role === "student");
  const ownClass = self.data?.results[0]?.current_class;
  if (role === "teacher") return { teacher: "me" };
  if (role === "student" && ownClass) return { school_class: String(ownClass) };
  return null;
}
