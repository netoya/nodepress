/**
 * WP REST API v2 contract validators.
 *
 * Pure functions — no Jest/Vitest matchers. Each throws a descriptive Error
 * on contract violation so the failure message pinpoints the exact missing field.
 *
 * Import these in any test that needs to verify WP-shape conformance.
 */

import type { WpPost, WpRenderedField } from "./fixtures.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function assertField(
  obj: Record<string, unknown>,
  field: string,
  expectedType: string,
  context: string,
): void {
  if (!(field in obj)) {
    throw new Error(`Missing field \`${field}\` in ${context}`);
  }
  const actualType = obj[field] === null ? "null" : typeof obj[field];
  if (
    actualType !== expectedType &&
    !(expectedType === "object" && actualType === "null")
  ) {
    throw new Error(
      `Field \`${field}\` in ${context}: expected ${expectedType}, got ${actualType}`,
    );
  }
}

function assertNotPresent(
  obj: Record<string, unknown>,
  field: string,
  divergenceId: string,
  context: string,
): void {
  if (field in obj && obj[field] !== undefined) {
    throw new Error(
      `${divergenceId}: field \`${field}\` MUST NOT be present in ${context} (NodePress v1 omits it)`,
    );
  }
}

function assertRenderedField(
  value: unknown,
  fieldName: string,
  context: string,
): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `DIV-002: field \`${fieldName}\` in ${context} must be an object {rendered, protected}, got ${typeof value}`,
    );
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj["rendered"] !== "string") {
    throw new Error(
      `DIV-002: field \`${fieldName}.rendered\` in ${context} must be a string, got ${typeof obj["rendered"]}`,
    );
  }
  if (typeof obj["protected"] !== "boolean") {
    throw new Error(
      `DIV-002: field \`${fieldName}.protected\` in ${context} must be a boolean, got ${typeof obj["protected"]}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public validators
// ---------------------------------------------------------------------------

/**
 * Asserts that a single post response object conforms to the NodePress WP
 * REST API v2 contract (including documented divergences).
 *
 * Throws a descriptive Error on the first violation found.
 */
export function assertPostShape(obj: unknown): asserts obj is WpPost {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    throw new Error(
      `Post shape: expected a plain object, got ${Array.isArray(obj) ? "array" : typeof obj}`,
    );
  }

  const post = obj as Record<string, unknown>;
  const ctx = "post response";

  // Required scalar fields
  assertField(post, "id", "number", ctx);
  assertField(post, "date", "string", ctx);
  assertField(post, "modified", "string", ctx);
  assertField(post, "slug", "string", ctx);
  assertField(post, "status", "string", ctx);
  assertField(post, "author", "number", ctx);

  // DIV-001 — gmt variants must NOT be present
  assertNotPresent(post, "date_gmt", "DIV-001", ctx);
  assertNotPresent(post, "modified_gmt", "DIV-001", ctx);

  // DIV-002 — rendered object shape
  assertRenderedField(post["title"], "title", ctx);
  assertRenderedField(post["content"], "content", ctx);
  assertRenderedField(post["excerpt"], "excerpt", ctx);

  // DIV-003 — absent WP fields must not appear
  for (const absent of [
    "featured_media",
    "comment_status",
    "ping_status",
    "format",
    "sticky",
    "template",
  ]) {
    assertNotPresent(post, absent, "DIV-003", ctx);
  }

  // DIV-005 — _nodepress namespace present with required sub-fields
  if (typeof post["_nodepress"] !== "object" || post["_nodepress"] === null) {
    throw new Error(
      `DIV-005: field \`_nodepress\` in ${ctx} must be an object, got ${typeof post["_nodepress"]}`,
    );
  }
  const np = post["_nodepress"] as Record<string, unknown>;
  assertField(np, "type", "string", `${ctx}._nodepress`);
  if (!("menu_order" in np) || typeof np["menu_order"] !== "number") {
    throw new Error(
      `DIV-005: field \`_nodepress.menu_order\` in ${ctx} must be a number`,
    );
  }
  if (!("parent_id" in np)) {
    throw new Error(
      `DIV-005: field \`_nodepress.parent_id\` in ${ctx} must be present (null or integer)`,
    );
  }
  if (!("meta" in np)) {
    throw new Error(
      `DIV-005: field \`_nodepress.meta\` in ${ctx} must be present`,
    );
  }

  // date / modified must be ISO 8601
  const dateIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  if (!dateIso.test(post["date"] as string)) {
    throw new Error(
      `field \`date\` in ${ctx} is not ISO 8601: ${String(post["date"])}`,
    );
  }
  if (!dateIso.test(post["modified"] as string)) {
    throw new Error(
      `field \`modified\` in ${ctx} is not ISO 8601: ${String(post["modified"])}`,
    );
  }
}

/**
 * Asserts that a list response conforms to contract:
 *  - body is an array
 *  - each element passes assertPostShape
 *  - pagination headers are present and valid integers when provided
 */
export function assertListShape(
  body: unknown,
  pagination?: { total: string | undefined; totalPages: string | undefined },
): asserts body is WpPost[] {
  if (!Array.isArray(body)) {
    throw new Error(`List shape: expected an array, got ${typeof body}`);
  }

  for (let i = 0; i < body.length; i++) {
    try {
      assertPostShape(body[i]);
    } catch (err) {
      throw new Error(
        `List shape: item[${i}] failed contract — ${(err as Error).message}`,
      );
    }
  }

  if (pagination) {
    const { total, totalPages } = pagination;
    if (total === undefined) {
      throw new Error("Missing header X-WP-Total in list response");
    }
    if (totalPages === undefined) {
      throw new Error("Missing header X-WP-TotalPages in list response");
    }
    if (isNaN(parseInt(total, 10))) {
      throw new Error(`X-WP-Total is not an integer: "${total}"`);
    }
    if (isNaN(parseInt(totalPages, 10))) {
      throw new Error(`X-WP-TotalPages is not an integer: "${totalPages}"`);
    }
  }
}

/**
 * Asserts that the response headers include the WP pagination headers
 * with valid integer string values.
 */
export function assertHeaders(
  headers: Record<string, string | undefined>,
): void {
  const total = headers["x-wp-total"];
  const totalPages = headers["x-wp-totalpages"];

  if (total === undefined) {
    throw new Error("Missing header X-WP-Total");
  }
  if (totalPages === undefined) {
    throw new Error("Missing header X-WP-TotalPages");
  }
  if (isNaN(parseInt(total, 10))) {
    throw new Error(`X-WP-Total is not an integer: "${total}"`);
  }
  if (isNaN(parseInt(totalPages, 10))) {
    throw new Error(`X-WP-TotalPages is not an integer: "${totalPages}"`);
  }
}

// Re-export fixture types for test consumers
export type { WpPost, WpRenderedField };
