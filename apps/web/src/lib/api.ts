import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

// ── Token helpers ────────────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tenant_token");
}

export function getTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("tenant_id");
}

export function getTenantUser(): { id: string; email: string; fullName: string; role: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("tenant_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function setAuthSession(data: {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
  user: { id: string; email: string; fullName: string; role: string };
}) {
  localStorage.setItem("tenant_token", data.accessToken);
  localStorage.setItem("tenant_refresh", data.refreshToken);
  localStorage.setItem("tenant_id", data.tenantId);
  localStorage.setItem("tenant_user", JSON.stringify(data.user));
}

export function logout() {
  localStorage.removeItem("tenant_token");
  localStorage.removeItem("tenant_refresh");
  localStorage.removeItem("tenant_id");
  localStorage.removeItem("tenant_user");
  window.location.href = "/login";
}

// ── Tenant fetch (dashboard pages) ───────────────────────────────────────────

export function dfetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers }).then(async (res) => {
    if (res.status === 401) {
      // Try to refresh token
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        const newToken = getAuthToken();
        const retryHeaders = new Headers(init?.headers);
        if (newToken) retryHeaders.set("Authorization", `Bearer ${newToken}`);
        return fetch(input, { ...init, headers: retryHeaders });
      }
      logout();
    }
    return res;
  });
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("tenant_refresh") : null;
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem("tenant_token", data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// ── SuperAdmin fetch ─────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("superadmin_token") : null;
  if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function saFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("superadmin_token") : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
