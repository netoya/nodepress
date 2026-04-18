import { useQuery } from "@tanstack/react-query";
import type { WpPost } from "../../../types/wp-post";

const API_BASE = "http://localhost:3000";

async function fetchPost(id: number): Promise<WpPost> {
  const response = await fetch(`${API_BASE}/wp/v2/posts/${id}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.status}`);
  }
  return (await response.json()) as WpPost;
}

/**
 * usePostQuery — React Query wrapper for GET /wp/v2/posts/:id.
 * Used by PostEditorPage in edit mode.
 */
export function usePostQuery(id: number | null) {
  return useQuery<WpPost, Error>({
    queryKey: ["post", id],
    queryFn: () => fetchPost(id!),
    enabled: id !== null,
  });
}
