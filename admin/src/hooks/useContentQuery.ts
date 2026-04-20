import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../lib/api";

// Auth headers without Content-Type (for DELETE requests which have no body)
function deleteAuthHeaders(): Record<string, string> {
  const token =
    (import.meta.env["VITE_ADMIN_TOKEN"] as string | undefined) ??
    "dev-admin-token";
  return { Authorization: `Bearer ${token}` };
}

/**
 * useContentQuery — hook factory for WP REST API v2 content endpoints.
 *
 * Accepts an endpoint string (e.g. "/wp/v2/pages") and returns 5 hooks that
 * cover the full CRUD surface for that endpoint without code duplication.
 *
 * Usage:
 *   const { useListQuery, useItemQuery, useCreateMutation, useUpdateMutation, useDeleteMutation }
 *     = useContentQuery("/wp/v2/pages");
 *
 * The posts feature already has hand-written hooks that coexist with this factory.
 * Migrate them incrementally — do NOT break existing hooks.
 */
export function useContentQuery<T extends { id: number }>(endpoint: string) {
  // Derive a stable cache key prefix from the endpoint path.
  // e.g. "/wp/v2/pages" → "pages"
  const cacheKey = endpoint.split("/").filter(Boolean).pop() ?? endpoint;

  // -------------------------------------------------------------------------
  // useListQuery — GET ${endpoint}?page=&per_page=
  // -------------------------------------------------------------------------
  function useListQuery(options: { page?: number; perPage?: number } = {}) {
    const { page = 1, perPage = 20 } = options;

    return useQuery<{ items: T[]; total: number; totalPages: number }, Error>({
      queryKey: [cacheKey, "list", { page, perPage }],
      queryFn: async () => {
        const url = new URL(apiUrl(endpoint));
        url.searchParams.set("page", String(page));
        url.searchParams.set("per_page", String(perPage));

        const response = await fetch(url.toString());
        if (!response.ok) {
          throw new Error(`Failed to fetch ${cacheKey}: ${response.status}`);
        }
        const items = (await response.json()) as T[];
        const total = Number(response.headers.get("X-WP-Total") ?? 0);
        const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? 1);
        return { items, total, totalPages };
      },
    });
  }

  // -------------------------------------------------------------------------
  // useItemQuery — GET ${endpoint}/:id
  // -------------------------------------------------------------------------
  function useItemQuery(id: number | null) {
    return useQuery<T, Error>({
      queryKey: [cacheKey, "item", id],
      queryFn: async () => {
        const response = await fetch(apiUrl(`${endpoint}/${id!}`));
        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${cacheKey} ${String(id)}: ${response.status}`,
          );
        }
        return (await response.json()) as T;
      },
      enabled: id !== null,
    });
  }

  // -------------------------------------------------------------------------
  // useCreateMutation — POST ${endpoint}
  // -------------------------------------------------------------------------
  function useCreateMutation<TPayload>() {
    const queryClient = useQueryClient();

    return useMutation<T, Error, TPayload>({
      mutationFn: async (payload) => {
        const response = await fetch(apiUrl(endpoint), {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(`Failed to create ${cacheKey}: ${response.status}`);
        }
        return (await response.json()) as T;
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [cacheKey, "list"] });
      },
    });
  }

  // -------------------------------------------------------------------------
  // useUpdateMutation — PUT ${endpoint}/:id
  // -------------------------------------------------------------------------
  function useUpdateMutation<TPayload>(id: number) {
    const queryClient = useQueryClient();

    return useMutation<T, Error, TPayload>({
      mutationFn: async (payload) => {
        const response = await fetch(apiUrl(`${endpoint}/${id}`), {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          throw new Error(
            `Failed to update ${cacheKey} ${id}: ${response.status}`,
          );
        }
        return (await response.json()) as T;
      },
      onSuccess: (updated) => {
        void queryClient.invalidateQueries({ queryKey: [cacheKey, "list"] });
        queryClient.setQueryData([cacheKey, "item", id], updated);
      },
    });
  }

  // -------------------------------------------------------------------------
  // useDeleteMutation — DELETE ${endpoint}/:id
  // -------------------------------------------------------------------------
  function useDeleteMutation() {
    const queryClient = useQueryClient();

    return useMutation<void, Error, number>({
      mutationFn: async (id) => {
        const response = await fetch(apiUrl(`${endpoint}/${id}`), {
          method: "DELETE",
          headers: deleteAuthHeaders(),
        });
        if (!response.ok) {
          throw new Error(
            `Failed to delete ${cacheKey} ${id}: ${response.status}`,
          );
        }
      },
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [cacheKey, "list"] });
      },
    });
  }

  return {
    useListQuery,
    useItemQuery,
    useCreateMutation,
    useUpdateMutation,
    useDeleteMutation,
  };
}
