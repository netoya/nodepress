import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../../../lib/api";

/**
 * useUninstallPlugin — DELETE /wp/v2/plugins/:slug
 * Backend marks status='uninstalled', does NOT delete the row (ADR-024).
 * On success, invalidates ["plugins-list"] so PluginsPage refetches.
 */
export function useUninstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (slug: string) => {
      // Encode slug — plugin identifiers can contain slashes (e.g. "plugin/plugin.php")
      const encodedSlug = encodeURIComponent(slug);
      const response = await fetch(apiUrl(`/wp/v2/plugins/${encodedSlug}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? `Uninstall failed: ${response.status}`);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plugins-list"] });
    },
  });
}
