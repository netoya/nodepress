import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../schema/index.js";
import { runSeed } from "./index.js";

// Load .env from repo root (same pattern as client.ts)
if (!process.env["DATABASE_URL"]) {
  const here = fileURLToPath(new URL(".", import.meta.url));
  config({ path: resolve(here, "../../../../.env") });
}

const { Pool } = pg;

/**
 * Reset database: truncate all tables in FK order, then re-seed.
 * DESTRUCTIVE — only runs in development (NODE_ENV !== production).
 */
async function resetDatabase(db: ReturnType<typeof drizzle>): Promise<void> {
  // Truncate in FK dependency order:
  // comments → posts, users
  // term_relationships → posts, terms
  // posts → users
  // terms → (none, but used by term_relationships)
  // options, plugin_registry, users → (none, but depended upon)
  // So reverse order: comments, term_relationships, posts, terms, options, plugin_registry, users

  const tables = [
    "comments",
    "term_relationships",
    "posts",
    "terms",
    "options",
    "plugin_registry",
    "users",
  ];

  for (const table of tables) {
    await db.execute(
      sql.raw(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`),
    );
  }
}

// Only run when invoked directly (tsx src/seeds/reset.ts)
if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  // Safety: refuse to run in production
  if (process.env["NODE_ENV"] === "production") {
    console.error(
      "❌ demo:reset is destructive and refuses to run with NODE_ENV=production",
    );
    process.exit(1);
  }

  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  resetDatabase(db)
    .then(() => runSeed(db))
    .then((counts) => {
      console.log(
        `✅ reset: truncated 7 tables, re-seeded ${counts.users} user + ${counts.posts} posts + ${counts.options} options`,
      );
      return pool.end();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("Reset failed:", err);
      void pool.end();
      process.exit(1);
    });
}
