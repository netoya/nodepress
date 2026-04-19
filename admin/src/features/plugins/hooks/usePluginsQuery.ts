import { useQuery } from "@tanstack/react-query";
import type { WpPlugin } from "../../../types/wp-post";
import { apiUrl } from "../../../lib/api";

/**
 * Fetch installed plugins from GET /wp/v2/plugins.
 * Supports optional full-text search via ?q= parameter (Sprint 7).
 */
async function fetchPlugins(search?: string): Promise<WpPlugin[]> {
  const path = search
    ? `/wp/v2/plugins?q=${encodeURIComponent(search)}`
    : "/wp/v2/plugins";
  const response = await fetch(apiUrl(path));
  if (!response.ok) {
    throw new Error(`Failed to fetch plugins: ${response.status}`);
  }
  return (await response.json()) as WpPlugin[];
}

/**
 * usePluginsQuery — React Query wrapper for GET /wp/v2/plugins.
 * Accepts an optional search string that maps to ?q= query param (Sprint 7).
 * Used by PluginsPage.
 */
export function usePluginsQuery(search?: string) {
  return useQuery<WpPlugin[], Error>({
    queryKey: ["plugins-list", search ?? ""],
    queryFn: () => fetchPlugins(search),
  });
}
