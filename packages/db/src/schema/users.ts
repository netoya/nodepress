import {
  pgTable,
  serial,
  varchar,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    login: varchar("login", { length: 60 }).notNull().unique(),
    email: varchar("email", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 250 }).notNull().default(""),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    roles: text("roles").array().notNull().default([]),
    capabilities: jsonb("capabilities").notNull().default({}),
    meta: jsonb("meta").notNull().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_login_idx").on(table.login),
    uniqueIndex("users_email_idx").on(table.email),
    index("users_created_at_idx").on(table.createdAt),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
