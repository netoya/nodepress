import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const pluginRatings = pgTable("plugin_ratings", {
  id: serial("id").primaryKey(),
  // Conceptual FK to plugin_registry.slug — no hard FK constraint in Sprint 7 stub
  pluginSlug: text("plugin_slug").notNull(),
  userId: text("user_id").notNull(),
  // Constraint: 1-5 — enforced at application layer (Sprint 8+)
  rating: integer("rating").notNull(),
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type PluginRating = typeof pluginRatings.$inferSelect;
export type NewPluginRating = typeof pluginRatings.$inferInsert;
