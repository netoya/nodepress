import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

// Auto-load .env from repo root if not already populated.
// Walk up from packages/db/src/ → ../../../.env.
if (!process.env["DATABASE_URL"]) {
  const here = fileURLToPath(new URL(".", import.meta.url));
  config({ path: resolve(here, "../../../.env") });
}

const { Pool } = pg;

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
