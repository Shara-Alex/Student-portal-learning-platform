import { api, type Paginated } from "@/lib/api";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Guardian, GuardianInput, SchoolClass, SchoolClassInput, Student, StudentInput } from "./types";

const BASE = "/api/students";

/** Build "?a=1&b=2", skipping empty values. */
function query(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : "";
}

// ---- Reading (queries) ----------------------------------------------------
export interface StudentFilters {
  search?: string;
  school_class?: string;
  status?: string;
  page?: number;
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
// One helper for "create when there is no id, otherwise update", used by all three forms.
// After a successful save we invalidate the related lists so they refetch.
function useSave<TInput, TResult>(path: string, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: TInput }) =>
      id ? api.patch<TResult>(`${BASE}/${path}/${id}/`, data) : api.post<TResult>(`${BASE}/${path}/`, data),
    onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}

function useRemove(path: string, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`${BASE}/${path}/${id}/`),
    onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}

export const useSaveStudent = () => useSave<StudentInput, Student>("students", ["students", "classes"]);
export const useSaveGuardian = () => useSave<GuardianInput, Guardian>("guardians", ["guardians", "students"]);
export const useSaveClass = () => useSave<SchoolClassInput, SchoolClass>("classes", ["classes", "students"]);
export const useDeleteGuardian = () => useRemove("guardians", ["guardians", "students"]);
export const useDeleteClass = () => useRemove("classes", ["classes"]);
