import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "../../../lib/api";
import type { WpUser } from "../../../types/wp-post";

async function fetchUsers(): Promise<WpUser[]> {
  const res = await fetch(apiUrl("/wp/v2/users"), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Failed to load users (${res.status})`);
  }
  return res.json() as Promise<WpUser[]>;
}

/**
 * React Query wrapper for GET /wp/v2/users.
 * Returns the full query object so callers can handle all 4 states.
 */
export function useUsersQuery() {
  return useQuery<WpUser[], Error>({
    queryKey: ["users-list"],
    queryFn: fetchUsers,
  });
}
