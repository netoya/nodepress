import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../schema/index.js";

// Load .env from repo root (same pattern as client.ts)
if (!process.env["DATABASE_URL"]) {
  const here = fileURLToPath(new URL(".", import.meta.url));
  config({ path: resolve(here, "../../../../.env") });
}

const { Pool } = pg;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function seedUsers(db: ReturnType<typeof drizzle>): Promise<void> {
  await db.execute(sql`
    INSERT INTO users (id, login, email, display_name, password_hash, roles, capabilities, meta)
    VALUES (
      1,
      'admin',
      'admin@nodepress.local',
      'Admin',
      'dev-only-placeholder',
      ARRAY['administrator']::text[],
      '{}',
      '{}'
    )
    ON CONFLICT DO NOTHING
  `);
}

async function seedPosts(db: ReturnType<typeof drizzle>): Promise<void> {
  const now = new Date();

  const postsData = [
    {
      title: "Welcome to NodePress",
      status: "publish",
      content:
        "<p>This CMS is built on Node.js with WP-compatible REST APIs.</p>",
    },
    {
      title: "The Hook System",
      status: "publish",
      content:
        "<p>NodePress hooks (filters and actions) are inspired by WordPress but native TypeScript.</p>",
    },
    {
      title: "Plugin Architecture",
      status: "publish",
      content:
        "<p>Plugins run in isolated vm.Context with circuit breaker protection.</p>",
    },
    {
      title: "Draft: Future Features",
      status: "draft",
      content: "<p>(Work in progress)</p>",
    },
    {
      title: "Pending Review",
      status: "pending",
      content: "<p>Pending editorial review.</p>",
    },
  ];

  for (const post of postsData) {
    const slug = slugify(post.title);
    await db.execute(sql`
      INSERT INTO posts (type, status, title, slug, content, excerpt, author_id, menu_order, meta, created_at, updated_at)
      VALUES (
        'post',
        ${post.status},
        ${post.title},
        ${slug},
        ${post.content},
        '',
        1,
        0,
        '{}',
        ${now},
        ${now}
      )
      ON CONFLICT (slug) DO NOTHING
    `);
  }
}

async function seedOptions(db: ReturnType<typeof drizzle>): Promise<void> {
  const optionsData = [
    { name: "siteurl", value: "http://localhost:3000" },
    { name: "blogname", value: "NodePress Demo" },
    { name: "blogdescription", value: "A modern CMS built on Node.js" },
  ];

  for (const option of optionsData) {
    await db.execute(sql`
      INSERT INTO options (name, value, autoload)
      VALUES (${option.name}, ${JSON.stringify(option.value)}, false)
      ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value
    `);
  }
}

export async function runSeed(
  db: ReturnType<typeof drizzle>,
): Promise<{ users: number; posts: number; options: number }> {
  await seedUsers(db);
  await seedPosts(db);
  await seedOptions(db);
  return { users: 1, posts: 5, options: 3 };
}

// Only run when invoked directly (tsx src/seeds/index.ts)
if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });

  runSeed(db)
    .then((counts) => {
      console.log(
        `✅ seeded ${counts.users} user, ${counts.posts} posts, ${counts.options} options`,
      );
      return pool.end();
    })
    .then(() => {
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("Seed failed:", err);
      void pool.end();
      process.exit(1);
    });
}
