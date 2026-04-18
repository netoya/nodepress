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

async function createPost(payload: CreatePostPayload): Promise<WpPost> {
  const response = await fetch(apiUrl("/wp/v2/posts"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
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
