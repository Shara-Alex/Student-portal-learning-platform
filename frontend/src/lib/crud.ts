/**
 * Small helpers every module's api.ts shares, so saving and deleting work the
 * same way everywhere.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

/** Build "?a=1&b=2", skipping empty values. */
export function query(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  const text = q.toString();
  return text ? `?${text}` : "";
}

/**
 * Create when there is no id, otherwise update.
 * `url` is the list address without a trailing slash, e.g. "/api/students/students".
 * `refresh` lists the query keys to refetch after a successful save.
 */
export function useSave<TInput, TResult>(url: string, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: TInput }) =>
      id ? api.patch<TResult>(`${url}/${id}/`, data) : api.post<TResult>(`${url}/`, data),
    onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}

export function useRemove(url: string, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete<null>(`${url}/${id}/`),
    onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}
