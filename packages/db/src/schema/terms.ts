import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { posts } from "./posts.ts";

export const terms = pgTable(
  "terms",
  {
    id: serial("id").primaryKey(),
    taxonomy: varchar("taxonomy", { length: 32 }).notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 200 }).notNull(),
    description: text("description").notNull().default(""),
    parentId: integer("parent_id"),
    meta: jsonb("meta").notNull().default({}),
  },
  (table) => [
    // slug is unique per taxonomy
    uniqueIndex("terms_taxonomy_slug_idx").on(table.taxonomy, table.slug),
    index("terms_taxonomy_idx").on(table.taxonomy),
  ],
);

export const termRelationships = pgTable(
  "term_relationships",
  {
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    termId: integer("term_id")
      .notNull()
      .references(() => terms.id, { onDelete: "cascade" }),
    order: integer("order").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.termId] }),
    index("term_relationships_term_id_idx").on(table.termId),
  ],
);

export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
export type TermRelationship = typeof termRelationships.$inferSelect;
export type NewTermRelationship = typeof termRelationships.$inferInsert;
