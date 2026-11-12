import { api } from "@/lib/api";
import { query, useRemove, useSave } from "@/lib/crud";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Assessment, ClassResult, GradeBand, GradeBandInput, GradingSettings, Markbook, ReportCard, Transcript,
} from "./types";

const BASE = "/api/assessments";
// Any change to marks, assessments or grading rules changes results, so all of these refetch together.
const RESULTS = ["markbook", "class-results", "report-card", "transcript"];

// ---- Reading --------------------------------------------------------------
export const useMarkbook = (assignment: string, term: string) =>
  useQuery({
    queryKey: ["markbook", assignment, term],
    queryFn: () => api.get<Markbook>(`${BASE}/gradebook/${query({ assignment, term })}`),
    enabled: !!assignment && !!term,
  });

export const useClassResults = (schoolClass: string, term: string) =>
  useQuery({
    queryKey: ["class-results", schoolClass, term],
    queryFn: () => api.get<ClassResult[]>(`${BASE}/class-results/${query({ school_class: schoolClass, term })}`),
    enabled: !!schoolClass && !!term,
  });

export const useReportCard = (student: number, term: string, enabled = true) =>
  useQuery({
    queryKey: ["report-card", student, term],
    queryFn: () => api.get<ReportCard>(`${BASE}/report-card/${query({ student, term })}`),
    enabled,
  });

/** This term's assessments that still have students without a mark (for the Today to-do list). */
export interface Outstanding { id: number; name: string; subject_name: string; school_class_name: string; marked: number; students: number }
export const useOutstanding = (enabled: boolean) =>
  useQuery({ queryKey: ["markbook", "outstanding"], queryFn: () => api.get<Outstanding[]>(`${BASE}/outstanding/`), enabled });

export const useTranscript = (student: number, enabled: boolean) =>
  useQuery({
    queryKey: ["transcript", student],
    queryFn: () => api.get<Transcript>(`${BASE}/transcript/${query({ student })}`),
    enabled,
  });

export const useBands = () =>
  useQuery({ queryKey: ["bands"], queryFn: () => api.get<GradeBand[]>(`${BASE}/bands/`) });

export const useGradingSettings = () =>
  useQuery({ queryKey: ["grading-settings"], queryFn: () => api.get<GradingSettings>(`${BASE}/settings/`) });

// ---- Writing --------------------------------------------------------------
/** A small helper: run a call, then refetch the lists named in `refresh`. */
function useAction<TInput, TResult>(run: (input: TInput) => Promise<TResult>, refresh: string[]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => refresh.forEach((key) => client.invalidateQueries({ queryKey: [key] })),
  });
}

// Assessments are sent as FormData (not JSON) because they can carry files.
export const useSaveAssessment = () => useSave<FormData, Assessment>(`${BASE}/assessments`, RESULTS);
export const useDeleteAssessment = () => useRemove(`${BASE}/assessments`, RESULTS);

/** Save one student's score in one assessment (one cell of the markbook). */
export const useSaveMark = () =>
  useAction(
    ({ assessment, student, score }: { assessment: number; student: number; score: number | null }) =>
      api.post(`${BASE}/assessments/${assessment}/marks/`, { marks: [{ student, score }] }),
    RESULTS,
  );

export const useSaveComment = () =>
  useAction(
    (data: { student: number; assignment: number; term: number; text: string }) => api.post(`${BASE}/comments/`, data),
    ["markbook", "report-card"],
  );

export const useSaveBand = () => useSave<GradeBandInput, GradeBand>(`${BASE}/bands`, ["bands", ...RESULTS]);
export const useDeleteBand = () => useRemove(`${BASE}/bands`, ["bands", ...RESULTS]);
export const useSaveGradingSettings = () =>
  useAction(
    (data: Pick<GradingSettings, "coursework_weight" | "pass_mark">) => api.put<GradingSettings>(`${BASE}/settings/`, data),
    ["grading-settings", ...RESULTS],
  );

export const downloadFile = (assessment: number, kind: "paper" | "marking_scheme") =>
  api.download(`${BASE}/assessments/${assessment}/file/${kind}/`, kind);
