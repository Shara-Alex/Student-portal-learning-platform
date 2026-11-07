/**
 * The ONE place the frontend talks to the backend.
 * Every module's api.ts calls api.get / api.post / ... — never fetch() directly.
 * If an API call is misbehaving, debug here.
 */
import { auth } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(`API ${status}`);
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = auth.getRefresh();
  if (!refresh) return false;
  const r = await fetch("/api/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!r.ok) return false;
  const data = await r.json();
  auth.set(data.access);
  return true;
}

async function request<T>(method: string, url: string, body?: unknown, retry = true): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = auth.getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

  // Access token expired -> refresh once and retry the same call.
  if (res.status === 401 && retry && (await refreshAccessToken())) {
    return request<T>(method, url, body, false);
  }
  if (res.status === 401) auth.clear();

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};
