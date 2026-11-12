import { api } from "@/lib/api";
import { query, useRemove, useSave } from "@/lib/crud";
import { useSchool } from "@/modules/core/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { BillInput, Fee, FeeInput, FeeSummary, Invoice, Payment, PaymentInput, Statement } from "./types";

const BASE = "/api/fees";
// Anything that changes what is owed or paid refreshes all of these.
const MONEY = ["invoices", "fee-summary", "statement"];

/** Returns a function that writes an amount with the school's currency: money(450) -> "USD 450.00". */
export function useMoney() {
  const currency = useSchool().data?.currency ?? "";
  return (amount: number) => `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
}

export interface InvoiceFilters { term?: string; school_class?: string; status?: string }

export const useInvoices = (filters: InvoiceFilters) =>
  useQuery({ queryKey: ["invoices", filters], queryFn: () => api.get<Invoice[]>(`${BASE}/invoices/${query({ ...filters })}`), enabled: !!filters.term });

export const useFeeSummary = (term: string, enabled = true) =>
  useQuery({ queryKey: ["fee-summary", term], queryFn: () => api.get<FeeSummary>(`${BASE}/invoices/summary/${query({ term })}`), enabled: enabled && !!term });

export const useStatement = (student: number | undefined) =>
  useQuery({ queryKey: ["statement", student], queryFn: () => api.get<Statement>(`${BASE}/statement/${query({ student })}`), enabled: !!student });

export const useFees = (term: string) =>
  useQuery({ queryKey: ["fees", term], queryFn: () => api.get<Fee[]>(`${BASE}/fees/${query({ term })}`), enabled: !!term });

export const useFeeSettings = () =>
  useQuery({ queryKey: ["fee-settings"], queryFn: () => api.get<{ late_fee: number }>(`${BASE}/settings/`) });

function useAction<TInput, TResult>(run: (input: TInput) => Promise<TResult>, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({ mutationFn: run, onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })) });
}

export const useSaveFee = () => useSave<FeeInput, Fee>(`${BASE}/fees`, ["fees"]);
export const useDeleteFee = () => useRemove(`${BASE}/fees`, ["fees"]);
export const useSaveFeeSettings = () => useAction((late_fee: number) => api.put(`${BASE}/settings/`, { late_fee }), ["fee-settings"]);
export const useBillClass = () => useAction((data: BillInput) => api.post<{ created: number; skipped: number }>(`${BASE}/invoices/bill/`, data), MONEY);
export const useApplyLateFees = () => useAction(() => api.post<{ applied: number }>(`${BASE}/invoices/apply-late-fees/`), MONEY);
export const useDeleteInvoice = () => useRemove(`${BASE}/invoices`, MONEY);
export const useRecordPayment = () => useAction((data: PaymentInput) => api.post<Payment>(`${BASE}/payments/`, data), MONEY);
export const useDeletePayment = () => useRemove(`${BASE}/payments`, MONEY);
