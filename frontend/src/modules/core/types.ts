// Mirrors backend/apps/core/serializers.py. Keep them in sync.
export type Role = "admin" | "teacher" | "parent" | "student";

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
  logo: string | null;
  currency: string;
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
