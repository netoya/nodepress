import { useQuery } from "@tanstack/react-query";
import type { PostsListResult, WpPost } from "../../../types/wp-post";

const API_BASE = "http://localhost:3000";

interface UsePostsListOptions {
  page?: number;
  perPage?: number;
  status?: string;
}

async function fetchPosts(
  options: UsePostsListOptions,
): Promise<PostsListResult> {
  const { page = 1, perPage = 10, status = "publish" } = options;
  const url = new URL(`${API_BASE}/wp/v2/posts`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("status", status);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  const posts = (await response.json()) as WpPost[];
  const total = Number(response.headers.get("X-WP-Total") ?? 0);
  const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? 1);

  return { posts, pagination: { total, totalPages } };
}

/**
 * usePostsList — React Query wrapper for GET /wp/v2/posts.
 * Returns posts array + WP pagination metadata from response headers.
 */
export function usePostsList(options: UsePostsListOptions = {}) {
  const { page = 1, perPage = 10, status = "publish" } = options;

  return useQuery<PostsListResult, Error>({
    queryKey: ["posts", { page, perPage, status }],
    queryFn: () => fetchPosts({ page, perPage, status }),
  });
}
