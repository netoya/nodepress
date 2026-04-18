/**
 * Demo hook registration — Sprint 1, live demo 2026-04-30.
 *
 * Registers two canonical WordPress-compatible filters against a shared
 * {@link HookRegistry} so the end-to-end demo flow can be reproduced against
 * a real HTTP server (not just the integration test harness):
 *
 * - `pre_save_post` — prepends `[DEMO] ` to the title of any post being
 *   created or updated, before the DB write.
 * - `the_content`   — appends `<footer>Powered by NodePress</footer>` to the
 *   raw content every time a post is serialized for the REST response.
 *
 * Both filters are attributed to the synthetic plugin id `"demo-plugin"` so
 * they can be removed as a group via `registry.removeAllByPlugin("demo-plugin")`
 * if a future hot-reload path needs it.
 *
 * Activation is gated at boot time by the `NODEPRESS_DEMO_MODE` env var; see
 * `packages/server/src/index.ts`. This module is intentionally decoupled from
 * any env/IO concerns — it only wires hooks into the registry it is given, so
 * it stays unit-testable in isolation.
 *
 * @see docs/process/demo-30-04-plan.md
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";
import { DEFAULT_HOOK_PRIORITY } from "@nodepress/core";

/** Stable id attributed to the demo filters for bulk cleanup. */
export const DEMO_PLUGIN_ID = "demo-plugin";

/**
 * Register the two demo filters against `registry`.
 *
 * Idempotency is NOT guaranteed: calling this function twice on the same
 * registry registers the filters twice. Production code must call it exactly
 * once (at boot) or call `registry.removeAllByPlugin(DEMO_PLUGIN_ID)` between
 * invocations.
 *
 * @param registry Target registry. Typically `server.hooks` at boot time, or
 *                 a fresh instance from `createHookRegistry()` in tests.
 */
export function registerDemoHooks(registry: HookRegistry): void {
  // pre_save_post: prepend [DEMO] to the title field of the post payload.
  // The payload shape is intentionally loose — we only touch `title` and
  // spread the rest to preserve any additional fields set upstream.
  const preSaveEntry: FilterEntry<{ title: string }> = {
    type: "filter",
    pluginId: DEMO_PLUGIN_ID,
    priority: DEFAULT_HOOK_PRIORITY,
    fn: (postData) => ({
      ...(postData as object),
      title: `[DEMO] ${(postData as { title: string }).title}`,
    }),
  };
  registry.addFilter("pre_save_post", preSaveEntry as FilterEntry);

  // the_content: append a footer marker to the rendered post content.
  const theContentEntry: FilterEntry<string> = {
    type: "filter",
    pluginId: DEMO_PLUGIN_ID,
    priority: DEFAULT_HOOK_PRIORITY,
    fn: (content) =>
      `${content as string}<footer>Powered by NodePress</footer>`,
  };
  registry.addFilter("the_content", theContentEntry as FilterEntry);
}
