import axios from "axios";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";

export const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("superadmin_token") : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function saFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("superadmin_token") : null;
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
