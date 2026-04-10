import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const pluginRegistry = pgTable(
  'plugin_registry',
  {
    slug: text('slug').primaryKey(),
    name: varchar('name', { length: 200 }).notNull(),
    version: varchar('version', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('inactive'),
    activatedAt: timestamp('activated_at'),
    errorLog: text('error_log'),
    meta: jsonb('meta').notNull().default({}),
  },
  (table) => [
    index('plugin_registry_status_idx').on(table.status),
  ],
);

export type PluginRegistry = typeof pluginRegistry.$inferSelect;
export type NewPluginRegistry = typeof pluginRegistry.$inferInsert;
