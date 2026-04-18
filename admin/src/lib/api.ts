/// <reference types="vite/client" />

/**
 * API base URL.
 * - VITE_API_URL set (e.g. "http://localhost:3000"): hits that backend.
 * - VITE_API_URL unset / empty: falls back to window.location.origin,
 *   which in dev is the Vite dev-server origin — MSW intercepts requests there.
 *
 * In test environments (jsdom), window.location.origin is "http://localhost:3000"
 * by default, so MSW node handlers still match.
 */
function resolveBase(): string {
  const envBase = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
  if (envBase) return envBase;
  // Relative-to-origin: works in browser + jsdom tests
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export const API_BASE_URL: string = resolveBase();

/**
 * Build a full API URL from a path.
 */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * Auth headers for write operations.
 * MSW handlers accept any token.
 * Real backend validates against NODEPRESS_ADMIN_TOKEN.
 */
export function authHeaders(): Record<string, string> {
  const token =
    (import.meta.env["VITE_ADMIN_TOKEN"] as string | undefined) ??
    "dev-admin-token";
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}
