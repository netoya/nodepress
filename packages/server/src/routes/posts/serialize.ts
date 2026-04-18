import type { Post } from "@nodepress/db";
import type { HookRegistry } from "@nodepress/core";

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
