import { useQuery } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../../../lib/api";

export interface WpSettings {
  title: string;
  description?: string;
  url: string;
  email: string;
  posts_per_page: number;
  default_category: number;
}

/**
 * useSettings — Fetch site settings from GET /wp/v2/settings.
 */
export function useSettings() {
  return useQuery<WpSettings>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/wp/v2/settings"), {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load settings: ${res.statusText}`);
      }

      return res.json() as Promise<WpSettings>;
    },
  });
}
