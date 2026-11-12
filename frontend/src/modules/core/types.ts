// Mirrors backend/apps/core/serializers.py. Keep them in sync.
// Six fixed roles. What each may do is grouped in lib/roles.ts.
export type Role = "admin" | "teacher" | "bursar" | "front_office" | "parent" | "student";

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: Role;
  phone: string;
}

export interface School {
  id: number;
  name: string;
  motto: string;
  address: string;
  phone: string;
  email: string;
  currency: string;
  has_logo: boolean;  // the picture itself is at /api/core/school/logo/ (see schoolLogoUrl in api.ts)
  time_zone: string;  // e.g. "Africa/Harare". Clocks and "the period on now" use the school's zone, not the phone's.
}

export interface Term {
  id: number;
  year: number;
  year_name: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

export interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  terms: Term[];
}
