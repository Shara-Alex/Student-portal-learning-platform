/**
 * Groups of roles. These mirror backend/apps/core/permissions.py; keep the two in sync.
 * Screens name a group, never a bare role, so adding a role later means editing this file only.
 * Remember: hiding a button is a courtesy. The backend checks every request again.
 */
import type { Role } from "@/modules/core/types";

export const ADMIN: Role[] = ["admin"];
export const TEACHING: Role[] = ["admin", "teacher"];        // may see marks and registers
export const OFFICE: Role[] = ["admin", "front_office"];     // may change student records and admissions
export const FINANCE: Role[] = ["admin", "bursar"];          // may see and change fees
export const ALL_STAFF: Role[] = ["admin", "teacher", "bursar", "front_office"];
export const FAMILY: Role[] = ["parent", "student"];
export const EVERYONE: Role[] = [...ALL_STAFF, ...FAMILY];

/** Is this role in the group? False while we do not know the role yet (still loading). */
export const inGroup = (role: Role | undefined, group: Role[]) => !!role && group.includes(role);

/** What each role is called on screen. */
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrator",
  teacher: "Teacher",
  bursar: "Bursar",
  front_office: "Front office",
  parent: "Parent",
  student: "Student",
};
