import type { Post } from "@nodepress/db";

/**
 * Renders a Post row from Drizzle into WordPress REST API v2 shape.
 * Maps DB columns to WP fields and wraps title/content/excerpt in {rendered, raw, protected}.
 * Omits date_gmt and modified_gmt per DIV-001.
 */
export function toWpPost(dbRow: Post) {
  return {
    id: dbRow.id,
    date: dbRow.createdAt.toISOString(),
    modified: dbRow.updatedAt.toISOString(),
    slug: dbRow.slug,
    status: dbRow.status,
    title: {
      rendered: dbRow.title,
      raw: dbRow.title,
      protected: false,
    },
    content: {
      rendered: dbRow.content,
      raw: dbRow.content,
      protected: false,
    },
    excerpt: {
      rendered: dbRow.excerpt,
      raw: dbRow.excerpt,
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
