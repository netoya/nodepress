import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const posts = pgTable(
  "posts",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 20 }).notNull().default("post"),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    title: varchar("title", { length: 255 }).notNull().default(""),
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    content: text("content").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),
    parentId: integer("parent_id"),
    menuOrder: integer("menu_order").notNull().default(0),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("posts_slug_idx").on(table.slug),
    index("posts_author_id_idx").on(table.authorId),
    index("posts_type_status_idx").on(table.type, table.status),
    index("posts_meta_gin_idx").using("gin", table.meta),
  ],
);

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
