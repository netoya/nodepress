import { useQuery } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../../../lib/api";
import type { WpTerm } from "../../../types/wp-post";

/**
 * useCategories — Fetch site categories from GET /wp/v2/categories.
 */
export function useCategories() {
  return useQuery<WpTerm[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/wp/v2/categories"), {
        headers: authHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to load categories: ${res.statusText}`);
      }

      return res.json() as Promise<WpTerm[]>;
    },
  });
}
