import { useMutation } from "@tanstack/react-query";
import { apiUrl, authHeaders } from "../../../lib/api";
import type { WpSettings } from "./useSettings";

/**
 * useSaveSettings — Save settings via PUT /wp/v2/settings.
 */
export function useSaveSettings() {
  return useMutation({
    mutationFn: async (settings: WpSettings) => {
      const res = await fetch(apiUrl("/wp/v2/settings"), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error(`Failed to save settings: ${res.statusText}`);
      }

      return res.json() as Promise<WpSettings>;
    },
  });
}
