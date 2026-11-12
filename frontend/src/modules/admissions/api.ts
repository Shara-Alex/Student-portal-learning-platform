import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Application, Stage } from "./types";

const BASE = "/api/admissions";

export const useApplications = (enabled = true) =>
  useQuery({ queryKey: ["applications"], queryFn: () => api.get<Application[]>(`${BASE}/applications/`), enabled });

function useAction<TInput, TResult>(run: (input: TInput) => Promise<TResult>, refresh = ["applications"]) {
  const client = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })) });
}

export const useUpdateApplication = () =>
  useAction(({ id, ...data }: { id: number; status?: Stage; notes?: string }) => api.patch<Application>(`${BASE}/applications/${id}/`, data));

/** Turn an application into a real student and guardian. */
export const useEnrol = () =>
  useAction(
    ({ id, ...data }: { id: number; admission_number: string; school_class: number | null }) => api.post<Application>(`${BASE}/applications/${id}/enrol/`, data),
    ["applications", "students", "classes", "guardians"],
  );

export const downloadDocument = (id: number) => api.download(`${BASE}/applications/${id}/document/`, "document");

// ---- the public form (no login) ------------------------------------------
export const usePublicSchool = () =>
  useQuery({ queryKey: ["public-school"], queryFn: () => api.get<{ school: string }>(`${BASE}/apply/`) });

export const useApply = () => useMutation({ mutationFn: (data: FormData) => api.post<{ received: boolean }>(`${BASE}/apply/`, data) });
