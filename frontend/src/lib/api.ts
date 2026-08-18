"use client";

const SESSION_KEY = "yk9_session_key";
const TOKEN_KEY = "yk9_access_token";
const REFRESH_KEY = "yk9_refresh_token";

export function getSessionKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(SESSION_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, key);
  }
  return key;
}

export function getTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === "undefined") return { access: null, refresh: null };
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function saveTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn(): boolean {
  return Boolean(getTokens().access);
}

type ApiOptions = RequestInit & {
  auth?: boolean;
  guest?: boolean;
  form?: boolean;
};

export class ApiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

async function refreshAccess(): Promise<string | null> {
  const { refresh } = getTokens();
  if (!refresh) return null;
  const res = await fetch("/api/auth/token/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = await res.json();
  saveTokens(data.access, refresh);
  return data.access as string;
}

export async function api<T = unknown>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { auth = false, guest = false, form = false, ...rest } = options;
  const headers: Record<string, string> = {
    ...((rest.headers as Record<string, string>) || {}),
  };
  if (!form) headers["Content-Type"] = "application/json";

  if (guest) headers["X-Session-Key"] = getSessionKey();
  if (auth) {
    let { access } = getTokens();
    if (!access) {
      access = await refreshAccess();
    }
    if (access) headers["Authorization"] = `Bearer ${access}`;
  }

  let res = await fetch(path, { ...rest, headers, cache: "no-store" });

  if (res.status === 401 && auth) {
    const refreshed = await refreshAccess();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${refreshed}`;
      res = await fetch(path, { ...rest, headers, cache: "no-store" });
    }
  }

  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body.detail === "string") detail = body.detail;
      else if (body && typeof body === "object") {
        const first = Object.values(body)[0];
        if (Array.isArray(first)) detail = String(first[0]);
        else if (first) detail = String(first);
      }
    } catch {
      /* keep default */
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
