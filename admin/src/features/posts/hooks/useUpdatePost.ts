import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WpPost } from "../../../types/wp-post";
import { apiUrl, authHeaders } from "../../../lib/api";

export interface UpdatePostPayload {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
}

async function updatePost(
  id: number,
  payload: UpdatePostPayload,
): Promise<WpPost> {
  const response = await fetch(apiUrl(`/wp/v2/posts/${id}`), {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Failed to update post: ${response.status}`);
  }
  return (await response.json()) as WpPost;
}

/**
 * useUpdatePost — mutation for PUT /wp/v2/posts/:id.
 * Invalidates posts-list and single post cache on success.
 */
export function useUpdatePost(id: number) {
  const queryClient = useQueryClient();

  return useMutation<WpPost, Error, UpdatePostPayload>({
    mutationFn: (payload) => updatePost(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["posts-list"] });
      queryClient.setQueryData(["post", id], updated);
    },
  });
}
