import type { Post } from "@nodepress/db";
import type { HookRegistry } from "@nodepress/core";
import type { BridgeOutput } from "../../bridge/index.js";

/**
 * No-op HookRegistry used as the default when no registry is provided.
 * Filters pass the value through unchanged; actions are no-ops.
 * This keeps toWpPost testable without a real registry dependency.
 */
const noopHooks: Pick<HookRegistry, "applyFilters"> = {
  applyFilters<T>(_name: string, value: T): T {
    return value;
  },
};

/**
 * Renders a Post row from Drizzle into WordPress REST API v2 shape.
 * Maps DB columns to WP fields and wraps title/content/excerpt in {rendered, protected}.
 * Omits raw field (only exposed via ?context=edit in WP; NodePress v1 uses context=view).
 * Omits date_gmt and modified_gmt per DIV-001.
 * NOTE: Full context support (?context=edit with auth) deferred to Sprint 2 (ADR-009).
 *
 * @param dbRow  The Drizzle Post row to serialize.
 * @param hooks  Optional HookRegistry. When provided, the `the_content` filter
 *               (sync) is applied to `content` before building the response.
 *               Defaults to a no-op so existing tests continue to pass without
 *               passing a registry.
 *
 * Hook applied:
 *   - **`the_content`** (filter, sync): `(content: string, post: Post) => string`
 *     Applied to `dbRow.content` before placing it in `content.rendered`.
 */
export function toWpPost(
  dbRow: Post,
  hooks: Pick<HookRegistry, "applyFilters"> = noopHooks,
) {
  const renderedContent = hooks.applyFilters<string>(
    "the_content",
    dbRow.content,
    dbRow,
  );

  return {
    id: dbRow.id,
    date: dbRow.createdAt.toISOString(),
    modified: dbRow.updatedAt.toISOString(),
    slug: dbRow.slug,
    status: dbRow.status,
    title: {
      rendered: dbRow.title,
      protected: false,
    },
    content: {
      rendered: renderedContent,
      protected: false,
    },
    excerpt: {
      rendered: dbRow.excerpt,
      protected: false,
    },
    author: dbRow.authorId,
    _nodepress: {
      type: dbRow.type,
      parent_id: dbRow.parentId ?? null,
      menu_order: dbRow.menuOrder,
      meta: dbRow.meta,
    },
  };
}

/**
 * Async version of toWpPost. Optionally pre-processes post content through
 * the Tier 2 bridge (PHP-WASM shortcode rendering) before applying the sync
 * the_content filter chain.
 *
 * ADR-017 §Hook Integration: The bridge's async work is hoisted before
 * applyFilters, and the bridge filter entry is a sync no-op anchor.
 *
 * @param dbRow   The Drizzle Post row to serialize.
 * @param hooks   Optional HookRegistry for the_content filter.
 * @param bridge  Optional bridge instance. If present, renderShortcodes is
 *                called with postContent and context. If renderShortcodes
 *                returns error != null, the original content is used (passthrough).
 *
 * Behavior:
 *   1. If bridge is provided: await renderShortcodes({ postContent, context })
 *   2. Use output.html (or original content if error) as input to the_content filter
 *   3. Return the same WP shape as toWpPost
 */

export async function toWpPostAsync(
  dbRow: Post,
  hooks: Pick<HookRegistry, "applyFilters"> = noopHooks,
  bridge?: { renderShortcodes: (input: any) => Promise<BridgeOutput> },
): Promise<ReturnType<typeof toWpPost>> {
  let contentForFilter = dbRow.content;

  if (bridge) {
    try {
      const bridgeOutput = await bridge.renderShortcodes({
        postContent: dbRow.content,
        context: {
          postId: dbRow.id,
          postType: dbRow.type,
          postStatus: dbRow.status,
        },
      });

      // Use rendered HTML if no error, otherwise passthrough original content
      contentForFilter =
        bridgeOutput.error === null ? bridgeOutput.html : dbRow.content;
    } catch {
      // Fail-safe: any unexpected error, use original content
      contentForFilter = dbRow.content;
    }
  }

  // Apply the_content filter chain (sync) to the bridge-processed HTML
  const renderedContent = hooks.applyFilters<string>(
    "the_content",
    contentForFilter,
    dbRow,
  );

  return {
    id: dbRow.id,
    date: dbRow.createdAt.toISOString(),
    modified: dbRow.updatedAt.toISOString(),
    slug: dbRow.slug,
    status: dbRow.status,
    title: {
      rendered: dbRow.title,
      protected: false,
    },
    content: {
      rendered: renderedContent,
      protected: false,
    },
    excerpt: {
      rendered: dbRow.excerpt,
      protected: false,
    },
    author: dbRow.authorId,
    _nodepress: {
      type: dbRow.type,
      parent_id: dbRow.parentId ?? null,
      menu_order: dbRow.menuOrder,
      meta: dbRow.meta,
    },
  };
}
