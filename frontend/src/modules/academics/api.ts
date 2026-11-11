import { api } from "@/lib/api";
import { query, useRemove, useSave } from "@/lib/crud";
import { useQuery } from "@tanstack/react-query";
import type {
  AssignmentInput, Period, PeriodInput, Subject, SubjectInput,
  TeachingAssignment, TimetableEntry, TimetableInput,
} from "./types";

const BASE = "/api/academics";

/** school_class = a class id. teacher = a user id, or "me" for whoever is logged in. */
export interface Filters {
  school_class?: string;
  teacher?: string;
}

// ---- Reading --------------------------------------------------------------
export const useSubjects = () =>
  useQuery({ queryKey: ["subjects"], queryFn: () => api.get<Subject[]>(`${BASE}/subjects/`) });

export const usePeriods = () =>
  useQuery({ queryKey: ["periods"], queryFn: () => api.get<Period[]>(`${BASE}/periods/`) });

export const useAssignments = (filters: Filters = {}, enabled = true) =>
  useQuery({
    queryKey: ["assignments", filters],
    queryFn: () => api.get<TeachingAssignment[]>(`${BASE}/assignments/${query({ ...filters })}`),
    enabled,
  });

export const useTimetable = (filters: Filters, enabled = true) =>
  useQuery({
    queryKey: ["timetable", filters],
    queryFn: () => api.get<TimetableEntry[]>(`${BASE}/timetable/${query({ ...filters })}`),
    enabled,
  });

// ---- Writing --------------------------------------------------------------
// Renaming a subject also changes what the assignments and timetable show, so they refetch too.
export const useSaveSubject = () => useSave<SubjectInput, Subject>(`${BASE}/subjects`, ["subjects", "assignments", "timetable"]);
export const useDeleteSubject = () => useRemove(`${BASE}/subjects`, ["subjects"]);
export const useSavePeriod = () => useSave<PeriodInput, Period>(`${BASE}/periods`, ["periods"]);
export const useDeletePeriod = () => useRemove(`${BASE}/periods`, ["periods"]);
export const useSaveAssignment = () => useSave<AssignmentInput, TeachingAssignment>(`${BASE}/assignments`, ["assignments", "timetable"]);
export const useDeleteAssignment = () => useRemove(`${BASE}/assignments`, ["assignments", "timetable"]);
export const useSaveLesson = () => useSave<TimetableInput, TimetableEntry>(`${BASE}/timetable`, ["timetable"]);
export const useDeleteLesson = () => useRemove(`${BASE}/timetable`, ["timetable"]);
