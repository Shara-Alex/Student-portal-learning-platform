import { api, type Paginated } from "@/lib/api";
import { query, useRemove, useSave } from "@/lib/crud";
import { bumpLogo } from "@/modules/core/api";
import type { AcademicYear, School, Term } from "@/modules/core/types";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminUser, SchoolInput, TermInput, UserInput, YearInput } from "./types";

const CORE = "/api/core";

// ---- Users ----------------------------------------------------------------
export interface UserFilters {
  search?: string;
  role?: string;
  is_active?: string; // "true" | "false" | "" (everyone)
  page?: number;
}

export const useUsers = (filters: UserFilters) =>
  useQuery({
    // Starts with "users", like the teacher picker's key, so saving a user refreshes both lists.
    queryKey: ["users", "manage", filters],
    queryFn: () => api.get<Paginated<AdminUser>>(`${CORE}/users/${query({ ...filters })}`),
    placeholderData: keepPreviousData,
  });

/** Add a user (no id) or change one (with id). There is no delete: a leaver is deactivated instead. */
export const useSaveUser = () => useSave<UserInput, AdminUser>(`${CORE}/users`, ["users"]);

/** An admin gives someone a new password. Nothing to refetch: passwords are never shown. */
export const useSetPassword = () =>
  useMutation({ mutationFn: ({ id, password }: { id: number; password: string }) => api.post<null>(`${CORE}/users/${id}/set-password/`, { password }) });

// ---- School profile -------------------------------------------------------
/**
 * Change the school's details. Three kinds of body:
 *   some fields as JSON      -> a normal save
 *   FormData holding `logo`  -> upload a new logo (files cannot travel as JSON)
 *   {logo: null}             -> remove the logo
 */
export function useSaveSchool() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<SchoolInput> | FormData | { logo: null }) => api.patch<School>(`${CORE}/school/`, data),
    onSuccess: (_saved, sent) => {
      // The picture changed: change its address too, so the browser drops its saved copy.
      if (sent instanceof FormData || "logo" in sent) bumpLogo();
      ["school", "public-school"].forEach((key) => client.invalidateQueries({ queryKey: [key] }));
    },
  });
}

// ---- Years and terms ------------------------------------------------------
// The years list carries its terms inside it, so a change to either refetches both.
const CALENDAR = ["years", "terms"];
export const useSaveYear = () => useSave<YearInput, AcademicYear>(`${CORE}/years`, CALENDAR);
export const useDeleteYear = () => useRemove(`${CORE}/years`, CALENDAR);
export const useSaveTerm = () => useSave<TermInput, Term>(`${CORE}/terms`, CALENDAR);
export const useDeleteTerm = () => useRemove(`${CORE}/terms`, CALENDAR);

/**
 * Make a year or a term the current one. The backend then un-sets the others by itself.
 * "Current" decides what nearly every screen shows by default (registers, marks, fees),
 * so afterwards EVERYTHING cached is refetched, not just the calendar.
 */
export function useMakeCurrent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, id }: { kind: "years" | "terms"; id: number }) => api.patch(`${CORE}/${kind}/${id}/`, { is_current: true }),
    onSuccess: () => client.invalidateQueries(),
  });
}
