import {
  pgTable,
  serial,
  varchar,
  jsonb,
  boolean,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

export const options = pgTable(
  'options',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 191 }).notNull().unique(),
    value: jsonb('value').notNull().default({}),
    autoload: boolean('autoload').notNull().default(false),
  },
  (table) => [
    uniqueIndex('options_name_idx').on(table.name),
    index('options_autoload_idx').on(table.autoload),
  ],
);

export type Option = typeof options.$inferSelect;
export type NewOption = typeof options.$inferInsert;
