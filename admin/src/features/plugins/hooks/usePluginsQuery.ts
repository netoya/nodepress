import { useQuery } from "@tanstack/react-query";
import type { WpPlugin } from "../../../types/wp-post";
import { apiUrl } from "../../../lib/api";

/**
 * Fetch all installed plugins from GET /wp/v2/plugins.
 * Sprint 5: backed by MSW stub. Real endpoint wired in Sprint 6.
 */
async function fetchPlugins(): Promise<WpPlugin[]> {
  const response = await fetch(apiUrl("/wp/v2/plugins"));
  if (!response.ok) {
    throw new Error(`Failed to fetch plugins: ${response.status}`);
  }
  return (await response.json()) as WpPlugin[];
}

/**
 * usePluginsQuery — React Query wrapper for GET /wp/v2/plugins.
 * Used by PluginsPage.
 */
export function usePluginsQuery() {
  return useQuery<WpPlugin[], Error>({
    queryKey: ["plugins-list"],
    queryFn: fetchPlugins,
  });
}
