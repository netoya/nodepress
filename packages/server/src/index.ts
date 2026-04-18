import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from repo root before any other module touches process.env.
const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import { registerBearerAuth } from "./auth/index.js";
import { registerHooks } from "./hooks.js";
import postsPlugin from "./routes/posts/index.js";
import publicPlugin from "./routes/public/index.js";

const server = Fastify({ logger: true });

// CORS — allow admin dev server (same-host, different port) + expose headers
// the WP REST clients rely on (X-WP-Total, X-WP-TotalPages).
await server.register(fastifyCors, {
  origin: true, // reflect request origin (dev-friendly; tighten in prod)
  credentials: true,
  exposedHeaders: ["X-WP-Total", "X-WP-TotalPages"],
});

// Register the bearer auth decorator.
// Routes that require admin should use:  { preHandler: [server.requireAdmin] }
// Public routes (e.g. GET /wp/v2/posts) omit the preHandler entirely.
await registerBearerAuth(server);

// Register the hook registry decorator before route plugins so handlers can
// access app.hooks at definition time.
await registerHooks(server);

// Demo hooks — opt-in via NODEPRESS_DEMO_MODE=true. Dynamic import keeps the
// demo module out of the hot path when the flag is off. See
// docs/process/demo-30-04-plan.md.
if (process.env["NODEPRESS_DEMO_MODE"] === "true") {
  const { registerDemoHooks } = await import("./demo/register-demo-hooks.js");
  registerDemoHooks(server.hooks);
  server.log.info("Demo hooks registered (pre_save_post + the_content).");
}

// Register the posts plugin
await server.register(postsPlugin);

// Register the public HTML renderer plugin
// (GET / for home + GET /p/:slug for single post pages)
await server.register(publicPlugin);

const port = Number(process.env["PORT"] ?? 3000);

try {
  await server.listen({ port, host: "0.0.0.0" });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
