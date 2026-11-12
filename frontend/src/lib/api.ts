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

/** Sends one call with the login token attached, and gives back the raw answer. */
async function send(method: string, url: string, body?: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = {};
  // A FormData body carries files. The browser must set its own Content-Type for it, so we leave it alone.
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const token = auth.getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;

  const payload = body === undefined ? undefined : isForm ? body : JSON.stringify(body);
  const res = await fetch(url, { method, headers, body: payload });

  // Access token expired -> refresh once and retry the same call.
  if (res.status === 401 && retry && (await refreshAccessToken())) {
    return send(method, url, body, false);
  }
  if (res.status === 401) auth.clear();
  return res;
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await send(method, url, body);
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data as T;
}

/**
 * Download a protected file. A plain link cannot send the login token, so we
 * fetch the file ourselves, then hand it to the browser as a download.
 */
async function download(url: string, fallbackName = "download") {
  const res = await send("GET", url);
  if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => null));
  const named = /filename="?([^";]+)"?/.exec(res.headers.get("Content-Disposition") ?? "");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(await res.blob());
  link.download = named?.[1] ?? fallbackName;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** The shape Django REST Framework returns for paginated lists. */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Turn a failed API call into one readable line, e.g. "admission_number: already exists". */
export function errorText(e: unknown): string {
  if (!(e instanceof ApiError)) return "Something went wrong. Please try again.";
  if (e.status === 403) return "You do not have permission to do that.";
  if (e.status === 429) return "Too many tries. Please wait a little and try again.";
  // The server sometimes answers with a plain list of messages: ["A score cannot be more than 50."]
  if (Array.isArray(e.data)) return e.data.join(" ");
  if (e.data && typeof e.data === "object") {
    return Object.entries(e.data as Record<string, unknown>)
      // A server crash also sends a "reference" code, but its message already quotes it, so skip the duplicate.
      .filter(([field]) => field !== "reference")
      .map(([field, msg]) => {
        const text = Array.isArray(msg) ? msg.join(" ") : String(msg);
        return field === "detail" || field === "non_field_errors" ? text : `${field.replace(/_/g, " ")}: ${text}`;
      })
      .join(" · ");
  }
  return `Request failed (${e.status}).`;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
  download,
};
