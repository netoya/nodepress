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
import usersPlugin from "./routes/users/index.js";
import mediaPlugin from "./routes/media/index.js";
import publicPlugin from "./routes/public/index.js";
import { registerBridgeHooks } from "./bridge/index.js";
import { registerFootnotesPlugin } from "./bridge/pilots/footnotes.js";
import { registerShortcodesUltimatePlugin } from "./bridge/pilots/shortcodes-ultimate.js";
import { registerDisplayPostsPlugin } from "./bridge/pilots/display-posts.js";

/**
 * Build and configure the Fastify server with all plugins and hooks.
 * Does not listen yet — caller must call server.listen().
 */
export async function buildServer() {
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

  // Tier 2 bridge + pilots — opt-in via NODEPRESS_TIER2=true.
  // Registers the PHP-WASM bridge hook anchor and the three content pilots
  // (Footnotes, Shortcodes Ultimate, Display Posts). Not loaded in demo mode
  // to avoid conflicts between demo hooks and Tier 2 pilot hooks.
  if (
    process.env["NODEPRESS_TIER2"] === "true" &&
    process.env["NODEPRESS_DEMO_MODE"] !== "true"
  ) {
    registerBridgeHooks(server.hooks);
    registerFootnotesPlugin(server.hooks);
    registerShortcodesUltimatePlugin(server.hooks);
    registerDisplayPostsPlugin(server.hooks);
    server.log.info(
      "Tier 2 bridge registered (bridge + footnotes + shortcodes-ultimate + display-posts).",
    );
  }

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

  // Register the users plugin (GET /wp/v2/users/me)
  await server.register(usersPlugin);

  // Register the media plugin
  await server.register(mediaPlugin);

  // Register the public HTML renderer plugin
  // (GET / for home + GET /p/:slug for single post pages)
  await server.register(publicPlugin);

  return server;
}

// Auto-start if run as main module (not imported).
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env["PORT"] ?? 3000);

  try {
    const server = await buildServer();
    await server.listen({ port, host: "0.0.0.0" });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}
