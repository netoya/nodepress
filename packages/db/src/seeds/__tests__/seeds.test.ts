/**
 * Seed tests — unit-level (no side effects on import) + optional idempotency
 * with real Postgres via Testcontainers.
 *
 * Docker guard: tests that require a running container are skipped when
 * DOCKER_AVAILABLE env var is not set to "true".
 */
import { describe, it, expect } from "vitest";

// ── Static import guard ──────────────────────────────────────────────────────
// Importing the module must not run queries or connect to a DB.
// We verify this by checking that runSeed is exported as a function and that
// no error is thrown during import (DATABASE_URL need not be set here).

describe("seeds module — import side effects", () => {
  it("exports runSeed as a function without connecting on import", async () => {
    // Importing with no DATABASE_URL should not throw — the guard only applies
    // when argv[1] matches the module path (CLI runner). In test context it
    // won't match, so the pool is never created.
    const mod = await import("../index.js");
    expect(typeof mod.runSeed).toBe("function");
  });
});

// ── Idempotency test (requires Docker) ──────────────────────────────────────

const dockerAvailable = process.env["DOCKER_AVAILABLE"] === "true";

describe.skipIf(!dockerAvailable)(
  "seeds idempotency — real Postgres (DOCKER_AVAILABLE=true)",
  () => {
    it("running seed twice does not duplicate posts", async () => {
      const { PostgreSqlContainer } =
        await import("@testcontainers/postgresql");
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const { default: pg } = await import("pg");
      const { sql } = await import("drizzle-orm");
      const { runSeed } = await import("../index.js");

      const container = await new PostgreSqlContainer(
        "postgres:16-alpine",
      ).start();
      const connectionString = container.getConnectionUri();

      const pool = new pg.Pool({ connectionString });
      const db = drizzle(pool, {});

      // Apply schema via raw SQL (minimal tables needed by seed)
      await db.execute(sql`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            login VARCHAR(60) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            display_name VARCHAR(250) NOT NULL DEFAULT '',
            password_hash VARCHAR(255) NOT NULL,
            roles TEXT[] NOT NULL DEFAULT '{}',
            capabilities JSONB NOT NULL DEFAULT '{}',
            meta JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
      await db.execute(sql`
          CREATE TABLE IF NOT EXISTS posts (
            id SERIAL PRIMARY KEY,
            type VARCHAR(20) NOT NULL DEFAULT 'post',
            status VARCHAR(20) NOT NULL DEFAULT 'draft',
            title VARCHAR(255) NOT NULL DEFAULT '',
            slug VARCHAR(200) NOT NULL UNIQUE,
            content TEXT NOT NULL DEFAULT '',
            excerpt TEXT NOT NULL DEFAULT '',
            author_id INTEGER NOT NULL REFERENCES users(id),
            parent_id INTEGER,
            menu_order INTEGER NOT NULL DEFAULT 0,
            meta JSONB NOT NULL DEFAULT '{}',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
          )
        `);
      await db.execute(sql`
          CREATE TABLE IF NOT EXISTS options (
            id SERIAL PRIMARY KEY,
            name VARCHAR(191) NOT NULL UNIQUE,
            value JSONB NOT NULL DEFAULT '{}',
            autoload BOOLEAN NOT NULL DEFAULT FALSE
          )
        `);

      // Run seed twice
      await runSeed(db);
      await runSeed(db);

      // Posts must still be exactly 5
      const result = await db.execute(
        sql`SELECT COUNT(*)::int AS cnt FROM posts`,
      );
      const row = result.rows[0] as { cnt: number };
      expect(row.cnt).toBe(5);

      await pool.end();
      await container.stop();
    }, 120_000);
  },
);
