/**
 * HookRegistry singleton for the NodePress server.
 *
 * Creates one shared {@link HookRegistry} instance at bootstrap time and
 * exposes it via a Fastify decorator (`app.hooks`) so every handler and
 * plugin can access it without importing a module-level global.
 *
 * Standard WP-style hook names used in this server:
 *
 * - **`pre_save_post`** (filter, sync)
 *   Applied to the post payload immediately before the DB insert/update.
 *   Signature: `(postData: PostPayload, meta: PreSavePostMeta) => PostPayload`
 *   `meta` carries `{ action: 'create' | 'update'; userId: number | undefined }`.
 *
 * - **`the_content`** (filter, sync)
 *   Applied to the raw content string when serializing a post for the REST response.
 *   Signature: `(content: string, post: Post) => string`
 *   `post` is the full Drizzle `Post` row (read-only).
 */

import type { FastifyInstance } from "fastify";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry } from "@nodepress/core";

// Module-level singleton — one registry per server process.
let _registry: HookRegistry | null = null;

/**
 * Returns the shared HookRegistry singleton.
 * Lazily initialised on first call; subsequent calls return the same instance.
 */
export function getHookRegistry(): HookRegistry {
  if (_registry === null) {
    _registry = createHookRegistry();
  }
  return _registry;
}

/**
 * Registers the `hooks` decorator on a Fastify instance.
 * Call this **before** registering any route plugins so that route handlers
 * can access `app.hooks`.
 *
 * @param app      The Fastify instance to decorate.
 * @param registry Optional HookRegistry to use instead of the singleton.
 *                 Provide a fresh registry in tests to achieve full isolation.
 *
 * ```ts
 * await registerHooks(server);
 * await server.register(postsPlugin);
 * ```
 */
export async function registerHooks(
  app: FastifyInstance,
  registry?: HookRegistry,
): Promise<void> {
  const reg = registry ?? getHookRegistry();
  app.decorate("hooks", reg);
}

// Extend FastifyInstance type so TypeScript knows about app.hooks
declare module "fastify" {
  interface FastifyInstance {
    hooks: HookRegistry;
  }
}
