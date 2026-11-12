import { api, type Paginated } from "@/lib/api";
import { auth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import type { AcademicYear, School, Term, User } from "./types";

export async function login(username: string, password: string) {
  const data = await api.post<{ access: string; refresh: string }>("/api/auth/login/", { username, password });
  auth.set(data.access, data.refresh);
}

export function logout() {
  auth.clear();
  window.location.href = "/login";
}

/**
 * Where the school logo lives. It needs no login, so a plain <img> can show it.
 * Browsers keep a copy of pictures; the number on the end changes after an upload
 * (bumpLogo) so the browser fetches the new picture instead of showing its old copy.
 */
let logoVersion = 0;
export const schoolLogoUrl = () => `/api/core/school/logo/?v=${logoVersion}`;
export const bumpLogo = () => {
  logoVersion = Date.now();
};

// Hooks: components call these; TanStack Query caches and refetches for us.
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => api.get<User>("/api/auth/me/"), enabled: auth.isLoggedIn() });

export const useSchool = () =>
  useQuery({ queryKey: ["school"], queryFn: () => api.get<School | null>("/api/core/school/") });

export const useTerms = () =>
  useQuery({ queryKey: ["terms"], queryFn: () => api.get<{ results: Term[] }>("/api/core/terms/") });

export const useTeachers = () =>
  useQuery({ queryKey: ["users", "teacher"], queryFn: () => api.get<Paginated<User>>("/api/core/users/?role=teacher&page_size=500") });

export const useYears = () =>
  useQuery({ queryKey: ["years"], queryFn: () => api.get<Paginated<AcademicYear>>("/api/core/years/") });
