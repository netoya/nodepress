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
  // Runtime override stored by LoginPage takes precedence
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("nodepress_api_base");
    if (stored) return stored;
  }
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

import type { WpTerm } from "../types/wp-post";

/**
 * Fetch all categories from GET /wp/v2/categories.
 */
export async function fetchCategories(): Promise<WpTerm[]> {
  const response = await fetch(apiUrl("/wp/v2/categories"));
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.status}`);
  }
  return (await response.json()) as WpTerm[];
}

/**
 * Fetch all tags from GET /wp/v2/tags.
 */
export async function fetchTags(): Promise<WpTerm[]> {
  const response = await fetch(apiUrl("/wp/v2/tags"));
  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.status}`);
  }
  return (await response.json()) as WpTerm[];
}

/**
 * Read the admin token.
 * Priority: localStorage → VITE_ADMIN_TOKEN env → empty string.
 */
export function getToken(): string {
  return (
    localStorage.getItem("nodepress_admin_token") ??
    (import.meta.env["VITE_ADMIN_TOKEN"] as string | undefined) ??
    ""
  );
}

/** Persist token to localStorage. */
export function setToken(token: string): void {
  localStorage.setItem("nodepress_admin_token", token);
}

/** Remove token from localStorage. */
export function clearToken(): void {
  localStorage.removeItem("nodepress_admin_token");
}

/** Returns true if a token is present. */
export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

/**
 * Auth headers for write operations.
 * MSW handlers accept any token.
 * Real backend validates against NODEPRESS_ADMIN_TOKEN.
 */
export function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

/**
 * Override the API base URL at runtime (used by LoginPage).
 * Stored in localStorage so it survives page reloads.
 */
export function setApiBase(url: string): void {
  localStorage.setItem("nodepress_api_base", url);
}
