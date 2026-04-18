import { useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = "http://localhost:3000";

async function deletePost(id: number): Promise<void> {
  const response = await fetch(`${API_BASE}/wp/v2/posts/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to delete post: ${response.status}`);
  }
}

/**
 * useDeletePost — mutation for DELETE /wp/v2/posts/:id (soft delete to trash).
 * Invalidates posts-list cache on success.
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: deletePost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts-list"] });
    },
  });
}
