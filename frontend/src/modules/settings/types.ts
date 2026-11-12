// Mirrors backend/apps/core/serializers.py (UserAdminSerializer, SchoolSerializer, years and terms). Keep them in sync.
// Settings has no backend folder of its own: its screens manage what lives in the backend's `core` app.
import type { AcademicYear, Role, School, Term } from "@/modules/core/types";

/** A login as an admin sees it on the Users screen. */
export interface AdminUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  role: Role;
  is_active: boolean;        // false = deactivated: cannot sign in, but their name stays on old marks and messages
  last_login: string | null;
  date_joined: string;
  linked_to: string;         // "Guardian: Mary Moyo" for a family login, otherwise ""
}

/** What we send to add or change a user. `password` only counts when adding. */
export type UserInput = Partial<Pick<AdminUser, "username" | "first_name" | "last_name" | "email" | "phone" | "role" | "is_active">> & { password?: string };

export type SchoolInput = Pick<School, "name" | "motto" | "address" | "phone" | "email" | "currency" | "time_zone">;
export type YearInput = Partial<Pick<AcademicYear, "name" | "start_date" | "end_date" | "is_current">>;
export type TermInput = Partial<Pick<Term, "year" | "name" | "start_date" | "end_date" | "is_current">>;
