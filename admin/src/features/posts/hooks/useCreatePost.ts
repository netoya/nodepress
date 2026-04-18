import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WpPost } from "../../../types/wp-post";
import { apiUrl, authHeaders } from "../../../lib/api";

export interface CreatePostPayload {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
}

/**
 * Strip empty optional fields so the backend derives defaults
 * (e.g. slug from title). Required fields (title, content, status)
 * are always sent.
 */
function toServerBody(payload: CreatePostPayload): Record<string, string> {
  const body: Record<string, string> = {
    title: payload.title,
    content: payload.content,
    status: payload.status,
  };
  if (payload.slug.trim() !== "") body["slug"] = payload.slug;
  if (payload.excerpt.trim() !== "") body["excerpt"] = payload.excerpt;
  return body;
}

async function createPost(payload: CreatePostPayload): Promise<WpPost> {
  const response = await fetch(apiUrl("/wp/v2/posts"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(toServerBody(payload)),
  });
  if (!response.ok) {
    throw new Error(`Failed to create post: ${response.status}`);
  }
  return (await response.json()) as WpPost;
}

/**
 * useCreatePost — mutation for POST /wp/v2/posts.
 * Invalidates posts-list cache on success.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation<WpPost, Error, CreatePostPayload>({
    mutationFn: createPost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts-list"] });
    },
  });
}
