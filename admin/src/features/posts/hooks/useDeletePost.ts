import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "../../../lib/api";

// Auth token for DELETE — no Content-Type needed (no body)
function deleteAuthHeaders(): Record<string, string> {
  const token =
    (import.meta.env["VITE_ADMIN_TOKEN"] as string | undefined) ??
    "dev-admin-token";
  return { Authorization: `Bearer ${token}` };
}

async function deletePost(id: number): Promise<void> {
  const response = await fetch(apiUrl(`/wp/v2/posts/${id}`), {
    method: "DELETE",
    headers: deleteAuthHeaders(),
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
