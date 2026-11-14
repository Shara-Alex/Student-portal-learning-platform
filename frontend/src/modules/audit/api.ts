import { api, type Paginated } from "@/lib/api";
import { query } from "@/lib/crud";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AuditEntry } from "./types";

/** Every way the trail can be narrowed. Anything left empty is simply not sent. */
export interface AuditFilters {
  action?: string;
  search?: string;      // words in the summary, or the name of who did it
  date_from?: string;   // YYYY-MM-DD
  date_to?: string;
  actor?: number;       // everything one member of staff did
  student?: number;     // everything about one student
  target_type?: string; // with target_id: the full history of one mark, payment or user
  target_id?: number;
  page?: number;
}

/**
 * The audit trail, newest first, a page at a time (admins only).
 * There is only a read hook: the backend has no address that changes or deletes an entry.
 */
export const useAuditEntries = (filters: AuditFilters) =>
  useQuery({
    queryKey: ["audit", filters],
    queryFn: () => api.get<Paginated<AuditEntry>>(`/api/audit/entries/${query({ ...filters })}`),
    placeholderData: keepPreviousData, // keep the old page on screen while the next one loads
  });
