/**
 * WP REST API v2 — Post types for NodePress admin.
 *
 * Derived from docs/api/openapi.yaml.
 * DO NOT import from packages/server/ — boundary violation.
 *
 * Divergence notes:
 * - DIV-001: date_gmt and modified_gmt are absent. NodePress exposes date and modified
 *   in ISO 8601. No UTC-separated columns exist yet.
 * - DIV-002: title, content, excerpt are stored as plain text in DB but serialized as
 *   {rendered, protected?} objects by the REST layer. Use RenderedField, not string.
 * - DIV-003: featured_media, comment_status, ping_status, format, sticky, template are
 *   absent — no columns in NodePress posts table. Treat as undefined when consuming API.
 * - DIV-005: _nodepress namespace carries extra fields (type, parent_id, menu_order, meta)
 *   not present in WP REST API v2 default response.
 */

/** WP-style rendered field object (DIV-002). */
export interface RenderedField {
  rendered: string;
  /** Present only when post is password-protected. */
  protected?: boolean;
}

/** Named post statuses supported by NodePress. */
export type PostStatus =
  | "publish"
  | "future"
  | "draft"
  | "pending"
  | "private"
  | "trash";

/**
 * NodePress-specific fields not present in WP REST API v2 (DIV-005).
 * Returned under _nodepress namespace to avoid collision.
 */
export interface NodepressPostMeta {
  type?: string;
  parent_id?: number | null;
  menu_order?: number;
  meta?: Record<string, unknown>;
}

/**
 * WP REST API v2 Post shape as returned by NodePress.
 * Missing WP fields: date_gmt, modified_gmt (DIV-001),
 * featured_media, comment_status, ping_status, format, sticky, template (DIV-003).
 */
export interface WpPost {
  /** Unique identifier for the post. */
  id: number;
  /** Publication date, local ISO 8601. Mapped from createdAt. */
  date: string;
  /** Last-modified date, local ISO 8601. Mapped from updatedAt. Optional (may be absent). */
  modified?: string;
  /** URL-friendly post identifier. */
  slug: string;
  /** Named post status. */
  status: PostStatus;
  /** Post title as rendered field (DIV-002). */
  title: RenderedField;
  /** Post content as rendered field (DIV-002). */
  content: RenderedField;
  /** Post excerpt as rendered field (DIV-002). Optional. */
  excerpt?: RenderedField;
  /** Author user ID. */
  author: number;
  /** NodePress-specific extra fields (DIV-005). */
  _nodepress?: NodepressPostMeta;
}

/**
 * WP REST API v2 — Taxonomy term (category or tag).
 * Returned by GET /wp/v2/categories and GET /wp/v2/tags.
 */
export interface WpTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  count: number;
}

/**
 * WP REST API v2 — Plugin shape as returned by GET /wp/v2/plugins.
 * Subset of the WP Plugins REST API spec.
 * Sprint 5 scope: list + enable/disable UI only (no install, no search).
 */
export interface WpPlugin {
  /** Plugin file identifier (e.g. "woocommerce/woocommerce.php"). */
  plugin: string;
  /** Human-readable plugin name. */
  name: string;
  /** Plugin version string. */
  version: string;
  /**
   * Plugin status — active | inactive | uninstalled.
   * Sprint 7: uninstall marks status='uninstalled', does not delete the row (ADR-024).
   */
  status: "active" | "inactive" | "uninstalled";
  /** Short plugin description. */
  description: string;
  /** Plugin author name. */
  author: string;
}

/**
 * WP REST API v2 — User role type.
 */
export type WpUserRole = "administrator" | "editor" | "author" | "subscriber";

/**
 * WP REST API v2 — User shape as returned by GET /wp/v2/users.
 * Subset of the WP Users REST API spec relevant to NodePress admin.
 */
export interface WpUser {
  /** Unique identifier for the user. */
  id: number;
  /** Display name. */
  name: string;
  /** User email address. */
  email: string;
  /** Assigned roles — WP supports multiple, NodePress UI shows the first. */
  roles: WpUserRole[];
  /** ISO 8601 registration date. */
  registered_date: string;
  /** URL-friendly user identifier. */
  slug: string;
}

/**
 * Pagination metadata extracted from WP REST API response headers.
 * X-WP-Total and X-WP-TotalPages.
 */
export interface WpPostsPagination {
  total: number;
  totalPages: number;
}

/** Shape returned by usePostsList hook. */
export interface PostsListResult {
  posts: WpPost[];
  pagination: WpPostsPagination;
}
