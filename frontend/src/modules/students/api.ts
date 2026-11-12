import { api, type Paginated } from "@/lib/api";
import { query, useRemove, useSave } from "@/lib/crud";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Guardian, GuardianInput, PromoteInput, SchoolClass, SchoolClassInput, Student, StudentInput } from "./types";

const BASE = "/api/students";

// ---- Reading (queries) ----------------------------------------------------
export interface StudentFilters {
  search?: string;
  school_class?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

export const useStudents = (filters: StudentFilters) =>
  useQuery({
    queryKey: ["students", filters],
    queryFn: () => api.get<Paginated<Student>>(`${BASE}/students/${query({ ...filters })}`),
    placeholderData: keepPreviousData, // keep the old rows on screen while the next page loads
  });

export const useClasses = () =>
  useQuery({ queryKey: ["classes"], queryFn: () => api.get<SchoolClass[]>(`${BASE}/classes/`) });

export const useGuardians = (search: string, enabled = true) =>
  useQuery({
    queryKey: ["guardians", search],
    queryFn: () => api.get<Paginated<Guardian>>(`${BASE}/guardians/${query({ search })}`),
    placeholderData: keepPreviousData,
    enabled,
  });

// ---- Writing (mutations) --------------------------------------------------
// useSave = create when there is no id, otherwise update. The second argument
// lists which cached lists to refetch after a successful save.
export const useSaveStudent = () => useSave<StudentInput, Student>(`${BASE}/students`, ["students", "classes"]);
export const useSaveGuardian = () => useSave<GuardianInput, Guardian>(`${BASE}/guardians`, ["guardians", "students"]);
export const useSaveClass = () => useSave<SchoolClassInput, SchoolClass>(`${BASE}/classes`, ["classes", "students"]);
export const useDeleteGuardian = () => useRemove(`${BASE}/guardians`, ["guardians", "students"]);
export const useDeleteClass = () => useRemove(`${BASE}/classes`, ["classes"]);

export function usePromote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: PromoteInput) =>
      api.post<{ promoted: number; graduated: number }>(`${BASE}/enrolments/promote/`, data),
    onSuccess: () => ["students", "classes"].forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}

/** Give a guardian or a student a username and password for the portal. kind = "guardians" | "students". */
export function useCreateLogin(kind: "guardians" | "students") {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, username, password }: { id: number; username: string; password: string }) =>
      api.post<{ username: string }>(`${BASE}/${kind}/${id}/login/`, { username, password }),
    onSuccess: () => ["students", "guardians"].forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}
