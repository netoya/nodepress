import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@nodepress/db";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

// Path to the single consolidated migration file
const MIGRATION_SQL_PATH = join(
  fileURLToPath(import.meta.url),
  "../../../../../../db/drizzle/0000_auto-generated-plugin-registry.sql",
);

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let _db: NodePgDatabase<typeof schema> | null = null;

/**
 * Starts a Postgres testcontainer, applies migrations, and returns the db client.
 * Call once in beforeAll of each suite.
 */
export async function setupTestDb(): Promise<NodePgDatabase<typeof schema>> {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();

  const connectionUri = container.getConnectionUri();
  process.env["DATABASE_URL"] = connectionUri;

  pool = new Pool({ connectionString: connectionUri });

  // Apply schema via migration SQL
  const migrationSql = readFileSync(MIGRATION_SQL_PATH, "utf8");
  // drizzle-kit uses "--> statement-breakpoint" as delimiter
  const statements = migrationSql
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  const client = await pool.connect();
  try {
    for (const stmt of statements) {
      await client.query(stmt);
    }
  } finally {
    client.release();
  }

  _db = drizzle(pool, { schema });
  return _db;
}

/**
 * Truncates all data tables in dependency order (posts depend on users).
 * Call in afterEach to isolate tests.
 */
export async function truncateAll(): Promise<void> {
  if (!pool)
    throw new Error("Test DB not initialized. Call setupTestDb first.");
  await pool.query(
    `TRUNCATE TABLE comments, term_relationships, posts, users, terms, options, plugin_registry RESTART IDENTITY CASCADE`,
  );
}

/**
 * Stops the container and closes the pool.
 * Call in afterAll.
 */
export async function teardownTestDb(): Promise<void> {
  await pool?.end();
  await container?.stop();
  pool = null;
  container = null;
  _db = null;
}

/**
 * Returns the current db instance. Must call setupTestDb first.
 */
export function getTestDb(): NodePgDatabase<typeof schema> {
  if (!_db) throw new Error("Test DB not initialized. Call setupTestDb first.");
  return _db;
}
