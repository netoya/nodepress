import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env from repo root (packages/db → ../../.env).
config({ path: resolve(__dirname, "../../.env") });

export default defineConfig({
  schema: [
    "./src/schema/posts.ts",
    "./src/schema/users.ts",
    "./src/schema/options.ts",
    "./src/schema/terms.ts",
    "./src/schema/comments.ts",
    "./src/schema/plugin-registry.ts",
  ],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] ?? "",
  },
});
