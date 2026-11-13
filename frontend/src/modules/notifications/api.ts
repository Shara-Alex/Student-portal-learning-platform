import { api, type Paginated } from "@/lib/api";
import { query } from "@/lib/crud";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Notification, NotificationSettings } from "./types";

const BASE = "/api/notifications";

// ---- Automatic emails (admin) ----------------------------------------------
export const useNotificationSettings = () =>
  useQuery({ queryKey: ["notification-settings"], queryFn: () => api.get<NotificationSettings>(`${BASE}/settings/`) });

/** Switch one or more automatic emails on or off. */
export function useSaveNotificationSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<NotificationSettings>) => api.put<NotificationSettings>(`${BASE}/settings/`, data),
    // The server answers with the saved settings, so store that answer instead of asking again.
    onSuccess: (saved) => client.setQueryData(["notification-settings"], saved),
  });
}

// ---- The sent-messages log (admin) -----------------------------------------
export interface LogFilters {
  kind?: string;
  status?: string;
  student?: number;
  page?: number;
}

/** Everything the school has emailed, newest first. */
export const useNotificationLog = (filters: LogFilters) =>
  useQuery({
    queryKey: ["notifications", filters],
    queryFn: () => api.get<Paginated<Notification>>(`${BASE}/log/${query({ ...filters })}`),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });

/** Send what is waiting, and try the failed ones again. */
export function useSendPending() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ sent: number; failed: number }>(`${BASE}/log/send-pending/`),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ---- Fee reminders (admin and bursar) --------------------------------------
/**
 * Email the guardians of every student who still owes money for a term (left out = the current term).
 * queued   = how many emails were created
 * no_email = how many students had no guardian with an email address, so nobody was told
 */
export function useFeeReminders() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (data: { term?: number; overdue_only: boolean }) =>
      api.post<{ queued: number; no_email: number }>(`${BASE}/log/fee-reminders/`, data),
    onSuccess: () => client.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
