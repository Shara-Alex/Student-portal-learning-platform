import { api } from "@/lib/api";
import { query } from "@/lib/crud";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Mark, MyRegister, Register, StudentAttendance, SummaryRow } from "./types";

const BASE = "/api/attendance";

export const useRegister = (schoolClass: string, date: string) =>
  useQuery({
    queryKey: ["register", schoolClass, date],
    queryFn: () => api.get<Register>(`${BASE}/register/${query({ school_class: schoolClass, date })}`),
    enabled: !!schoolClass && !!date,
  });

export const useMyRegisters = (enabled = true) =>
  useQuery({ queryKey: ["register", "mine"], queryFn: () => api.get<MyRegister[]>(`${BASE}/my-registers/`), enabled });

export const useAttendanceSummary = (schoolClass: string, term: string) =>
  useQuery({
    queryKey: ["attendance-summary", schoolClass, term],
    queryFn: () => api.get<SummaryRow[]>(`${BASE}/summary/${query({ school_class: schoolClass, term })}`),
    enabled: !!schoolClass && !!term,
  });

export const useStudentAttendance = (student: number | undefined, term: string) =>
  useQuery({
    queryKey: ["attendance-summary", "student", student, term],
    queryFn: () => api.get<StudentAttendance>(`${BASE}/student/${query({ student, term })}`),
    enabled: !!student && !!term,
  });

export function useSaveRegister() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ schoolClass, date, entries }: { schoolClass: string; date: string; entries: { student: number; status: Mark }[] }) =>
      api.post<Register>(`${BASE}/register/${query({ school_class: schoolClass, date })}`, { entries }),
    onSuccess: () => ["register", "attendance-summary"].forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}
