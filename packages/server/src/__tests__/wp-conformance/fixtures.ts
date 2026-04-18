/**
 * WP REST API v2 reference fixtures.
 *
 * These represent what a clean WordPress installation would return for a post.
 * NodePress responses are validated against the contract derived from these fixtures.
 *
 * DIV-001: date_gmt / modified_gmt are absent — NodePress omits them (ADR-006).
 * DIV-002: title, content, excerpt are objects {rendered, raw, protected}.
 * DIV-003: featured_media, comment_status, ping_status, format, sticky, template absent.
 * DIV-005: _nodepress namespace carries extra fields instead of polluting WP contract.
 */

export interface WpRenderedField {
  rendered: string;
  protected: boolean;
}

export interface WpNodepressNamespace {
  type: string;
  parent_id: number | null;
  menu_order: number;
  meta: Record<string, unknown> | null;
}

/**
 * NodePress-flavoured WP Post shape.
 * WP-standard fields present; divergences documented inline.
 */
export interface WpPost {
  id: number;
  date: string; // ISO 8601, maps from createdAt
  modified: string; // ISO 8601, maps from updatedAt
  // date_gmt absent — DIV-001
  // modified_gmt absent — DIV-001
  slug: string;
  status: "publish" | "future" | "draft" | "pending" | "private" | "trash";
  title: WpRenderedField; // object — DIV-002
  content: WpRenderedField; // object — DIV-002
  excerpt: WpRenderedField; // object — DIV-002
  author: number;
  // featured_media absent — DIV-003
  // comment_status absent — DIV-003
  // ping_status absent — DIV-003
  // format absent — DIV-003
  // sticky absent — DIV-003
  // template absent — DIV-003
  _nodepress: WpNodepressNamespace; // DIV-005
}

/**
 * Static reference fixture — post ID 1.
 * Represents the serialized output NodePress should produce.
 */
export const FIXTURE_POST_1: WpPost = {
  id: 1,
  date: "2026-04-17T10:00:00.000Z",
  modified: "2026-04-17T12:00:00.000Z",
  slug: "hello-world",
  status: "publish",
  title: { rendered: "Hello World", protected: false },
  content: {
    rendered: "<p>Welcome to NodePress.</p>",
    protected: false,
  },
  excerpt: { rendered: "A short intro.", protected: false },
  author: 1,
  _nodepress: {
    type: "post",
    parent_id: null,
    menu_order: 0,
    meta: null,
  },
};

/**
 * Static reference fixture — post ID 2.
 * Draft post with non-null parent_id.
 */
export const FIXTURE_POST_2: WpPost = {
  id: 2,
  date: "2026-04-17T14:00:00.000Z",
  modified: "2026-04-17T15:00:00.000Z",
  slug: "draft-post",
  status: "draft",
  title: { rendered: "Draft Post", protected: false },
  content: { rendered: "<p>Draft content.</p>", protected: false },
  excerpt: { rendered: "", protected: false },
  author: 1,
  _nodepress: {
    type: "post",
    parent_id: null,
    menu_order: 1,
    meta: null,
  },
};
