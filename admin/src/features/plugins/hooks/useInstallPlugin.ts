import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { WpPlugin } from "../../../types/wp-post";
import { apiUrl, authHeaders } from "../../../lib/api";

export interface InstallPluginPayload {
  slug: string;
  registryUrl?: string;
}

/**
 * useInstallPlugin — POST /wp/v2/plugins
 * On success, invalidates ["plugins-list"] so PluginsPage refetches.
 */
export function useInstallPlugin() {
  const queryClient = useQueryClient();

  return useMutation<WpPlugin, Error, InstallPluginPayload>({
    mutationFn: async (payload) => {
      const response = await fetch(apiUrl("/wp/v2/plugins"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(body.message ?? `Install failed: ${response.status}`);
      }
      return (await response.json()) as WpPlugin;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plugins-list"] });
    },
  });
}
