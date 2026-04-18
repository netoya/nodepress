import { useQuery } from "@tanstack/react-query";
import type { PostsListResult, WpPost } from "../../../types/wp-post";

const API_BASE = "http://localhost:3000";

interface UsePostsQueryOptions {
  page?: number;
  perPage?: number;
  status?: string;
}

async function fetchPosts(
  options: UsePostsQueryOptions,
): Promise<PostsListResult> {
  const { page = 1, perPage = 20, status } = options;
  const url = new URL(`${API_BASE}/wp/v2/posts`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  if (status) {
    url.searchParams.set("status", status);
  }

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
 * usePostsQuery — React Query wrapper for GET /wp/v2/posts.
 * Used by PostsListPage. Supports pagination state.
 */
export function usePostsQuery(options: UsePostsQueryOptions = {}) {
  const { page = 1, perPage = 20, status } = options;

  return useQuery<PostsListResult, Error>({
    queryKey: ["posts-list", { page, perPage, status }],
    queryFn: () =>
      fetchPosts({
        page,
        perPage,
        ...(status !== undefined ? { status } : {}),
      }),
  });
}
