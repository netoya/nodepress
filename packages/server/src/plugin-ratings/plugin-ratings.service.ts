import type { PluginRating } from "@nodepress/db";

export interface AddRatingData {
  pluginSlug: string;
  userId: string;
  /** Must be between 1 and 5 — validated at call site */
  rating: number;
  review?: string;
}

/**
 * Plugin ratings service — Sprint 7 stub.
 * Full implementation deferred to Sprint 8 (community features).
 */
export class PluginRatingsService {
  async getRatingsForPlugin(_slug: string): Promise<PluginRating[]> {
    throw new Error("Not implemented — Sprint 8");
  }

  async addRating(_data: AddRatingData): Promise<PluginRating> {
    throw new Error("Not implemented — Sprint 8");
  }
}
