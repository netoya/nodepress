/**
 * Real-DB integration tests for packages/db schema.
 * Requires Docker. Skipped automatically if DOCKER_AVAILABLE !== "true".
 *
 * Uses Testcontainers helpers. The helpers live in packages/server — they are
 * copied here with a TODO rather than extracted to a shared package, as that
 * extraction is out of scope for #29.
 *
 * TODO(#29-followup): extract Testcontainers helpers to packages/shared-test-utils
 * so both server and db packages can import them without duplication.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../schema/index.js";
import {
  posts,
  users,
  options,
  pluginRegistry,
  comments,
  terms,
} from "../schema/index.js";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Inline Testcontainers helpers (copied from packages/server/src/__tests__/helpers/db.ts)
// TODO: extract to packages/shared-test-utils once #29-followup is scheduled.
// ---------------------------------------------------------------------------

const MIGRATION_SQL_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../drizzle/0000_auto-generated-plugin-registry.sql",
);

let container: StartedPostgreSqlContainer | null = null;
let pool: pg.Pool | null = null;
let db: NodePgDatabase<typeof schema>;

async function setupTestDb(): Promise<NodePgDatabase<typeof schema>> {
  container = await new PostgreSqlContainer("postgres:16-alpine").start();
  const connectionUri = container.getConnectionUri();
  process.env["DATABASE_URL"] = connectionUri;
  pool = new Pool({ connectionString: connectionUri });

  const migrationSql = readFileSync(MIGRATION_SQL_PATH, "utf8");
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

  return drizzle(pool, { schema });
}

async function truncateAll(): Promise<void> {
  await pool!.query(
    `TRUNCATE TABLE comments, term_relationships, posts, users, terms, options, plugin_registry RESTART IDENTITY CASCADE`,
  );
}

async function teardownTestDb(): Promise<void> {
  await pool?.end();
  await container?.stop();
  pool = null;
  container = null;
}

// ---------------------------------------------------------------------------
// Suite guard — skip if Docker not available
// ---------------------------------------------------------------------------

const DOCKER = process.env["DOCKER_AVAILABLE"] === "true";
const maybeDescribe = DOCKER ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Shared user fixture (posts require authorId FK)
// ---------------------------------------------------------------------------

async function seedUser(db: NodePgDatabase<typeof schema>) {
  const [user] = await db
    .insert(users)
    .values({
      login: "ingrid",
      email: "ingrid@nodepress.dev",
      passwordHash: "hashed",
      displayName: "Ingrid",
    })
    .returning();
  return user!;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  if (!DOCKER) return;
  db = await setupTestDb();
});

afterAll(async () => {
  if (!DOCKER) return;
  await teardownTestDb();
});

afterEach(async () => {
  if (!DOCKER) return;
  await truncateAll();
});

// ===========================================================================
// posts
// ===========================================================================

maybeDescribe("posts", () => {
  it("INSERT + SELECT — required fields round-trip with correct shape", async () => {
    const user = await seedUser(db);
    const [inserted] = await db
      .insert(posts)
      .values({
        title: "Hello NodePress",
        slug: "hello-nodepress",
        content: "Content body",
        excerpt: "Short summary",
        authorId: user.id,
        status: "publish",
        type: "post",
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted!.title).toBe("Hello NodePress");
    expect(inserted!.slug).toBe("hello-nodepress");
    expect(inserted!.status).toBe("publish");
    expect(inserted!.authorId).toBe(user.id);
    expect(inserted!.createdAt).toBeInstanceOf(Date);
    expect(inserted!.updatedAt).toBeInstanceOf(Date);
    // meta defaults to empty object
    expect(inserted!.meta).toEqual({});
  });

  it("UPDATE — updatedAt can be refreshed by app", async () => {
    const user = await seedUser(db);
    const [post] = await db
      .insert(posts)
      .values({
        title: "Before update",
        slug: "before-update",
        authorId: user.id,
      })
      .returning();

    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 10));

    const newTime = new Date();
    const [updated] = await db
      .update(posts)
      .set({ title: "After update", updatedAt: newTime })
      .where(eq(posts.id, post!.id))
      .returning();

    expect(updated!.title).toBe("After update");
    // updatedAt should be >= the value we set
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(
      newTime.getTime() - 1,
    );
  });

  it("DELETE soft — status=trash verified via query", async () => {
    const user = await seedUser(db);
    const [post] = await db
      .insert(posts)
      .values({ slug: "to-trash", authorId: user.id })
      .returning();

    await db
      .update(posts)
      .set({ status: "trash" })
      .where(eq(posts.id, post!.id));

    const [fetched] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, post!.id));
    expect(fetched!.status).toBe("trash");
  });

  it("CONSTRAINT — duplicate slug rejects with unique violation", async () => {
    const user = await seedUser(db);
    await db.insert(posts).values({ slug: "unique-slug", authorId: user.id });

    await expect(
      db.insert(posts).values({ slug: "unique-slug", authorId: user.id }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// users
// ===========================================================================

maybeDescribe("users", () => {
  it("INSERT + SELECT by id — shape correct", async () => {
    const [user] = await db
      .insert(users)
      .values({
        login: "carmen",
        email: "carmen@nodepress.dev",
        passwordHash: "bcrypt_hash",
        displayName: "Carmen",
        roles: ["editor"],
      })
      .returning();

    const [fetched] = await db
      .select()
      .from(users)
      .where(eq(users.id, user!.id));

    expect(fetched!.login).toBe("carmen");
    expect(fetched!.email).toBe("carmen@nodepress.dev");
    expect(fetched!.roles).toEqual(["editor"]);
    expect(fetched!.capabilities).toEqual({});
  });

  it("CONSTRAINT — duplicate email rejects with unique violation", async () => {
    await db.insert(users).values({
      login: "user1",
      email: "dup@nodepress.dev",
      passwordHash: "h",
    });

    await expect(
      db.insert(users).values({
        login: "user2",
        email: "dup@nodepress.dev",
        passwordHash: "h",
      }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// options
// ===========================================================================

maybeDescribe("options", () => {
  it("INSERT key/value + SELECT by name", async () => {
    await db
      .insert(options)
      .values({ name: "siteurl", value: "https://nodepress.dev" });

    const [opt] = await db
      .select()
      .from(options)
      .where(eq(options.name, "siteurl"));

    expect(opt!.value).toBe("https://nodepress.dev");
    expect(opt!.autoload).toBe(false);
  });

  it("UPDATE value of existing key", async () => {
    await db.insert(options).values({ name: "blogname", value: "Old Name" });
    await db
      .update(options)
      .set({ value: "New Name" })
      .where(eq(options.name, "blogname"));

    const [opt] = await db
      .select()
      .from(options)
      .where(eq(options.name, "blogname"));
    expect(opt!.value).toBe("New Name");
  });
});

// ===========================================================================
// plugin_registry
// ===========================================================================

maybeDescribe("plugin_registry", () => {
  it("INSERT plugin active + SELECT by slug", async () => {
    const now = new Date();
    await db.insert(pluginRegistry).values({
      slug: "wc-compat",
      name: "WC Compat",
      version: "1.0.0",
      status: "active",
      activatedAt: now,
    });

    const [plugin] = await db
      .select()
      .from(pluginRegistry)
      .where(eq(pluginRegistry.slug, "wc-compat"));

    expect(plugin!.name).toBe("WC Compat");
    expect(plugin!.status).toBe("active");
    expect(plugin!.activatedAt).toBeInstanceOf(Date);
  });

  it("UPDATE status active → inactive", async () => {
    await db.insert(pluginRegistry).values({
      slug: "my-plugin",
      name: "My Plugin",
      version: "0.5.0",
      status: "active",
    });

    await db
      .update(pluginRegistry)
      .set({ status: "inactive" })
      .where(eq(pluginRegistry.slug, "my-plugin"));

    const [plugin] = await db
      .select()
      .from(pluginRegistry)
      .where(eq(pluginRegistry.slug, "my-plugin"));
    expect(plugin!.status).toBe("inactive");
  });
});

// ===========================================================================
// comments — smoke real INSERT/SELECT
// ===========================================================================

maybeDescribe("comments", () => {
  it("INSERT + SELECT — guest comment on a post", async () => {
    const user = await seedUser(db);
    const [post] = await db
      .insert(posts)
      .values({ slug: "commented-post", authorId: user.id })
      .returning();

    const [comment] = await db
      .insert(comments)
      .values({
        postId: post!.id,
        content: "Great post!",
        status: "approved",
      })
      .returning();

    const [fetched] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, comment!.id));
    expect(fetched!.content).toBe("Great post!");
    expect(fetched!.status).toBe("approved");
    expect(fetched!.authorId).toBeNull();
  });
});

// ===========================================================================
// terms — smoke real INSERT/SELECT
// ===========================================================================

maybeDescribe("terms", () => {
  it("INSERT + SELECT — category term round-trip", async () => {
    const [term] = await db
      .insert(terms)
      .values({
        taxonomy: "category",
        name: "Technology",
        slug: "technology",
        description: "Tech articles",
      })
      .returning();

    const [fetched] = await db
      .select()
      .from(terms)
      .where(eq(terms.id, term!.id));
    expect(fetched!.name).toBe("Technology");
    expect(fetched!.taxonomy).toBe("category");
    expect(fetched!.description).toBe("Tech articles");
  });
});
