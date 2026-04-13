import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { posts } from "./posts.js";
import { users } from "./users.js";

export const comments = pgTable(
  "comments",
  {
    id: serial("id").primaryKey(),
    postId: integer("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // nullable — guest comments have no user account
    authorId: integer("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    parentId: integer("parent_id"),
    content: text("content").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    type: varchar("type", { length: 20 }).notNull().default("comment"),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("comments_post_id_idx").on(table.postId),
    index("comments_author_id_idx").on(table.authorId),
    index("comments_status_idx").on(table.status),
    index("comments_parent_id_idx").on(table.parentId),
  ],
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
