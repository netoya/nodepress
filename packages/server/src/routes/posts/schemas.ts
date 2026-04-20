/**
 * JSON Schemas for Posts endpoints.
 * Derived from OpenAPI spec — used by Fastify for request/response validation.
 */

export const RenderedFieldSchema = {
  type: "object" as const,
  required: ["rendered"],
  properties: {
    rendered: { type: "string" },
    raw: { type: "string" },
    protected: { type: "boolean" },
  },
};

export const PostSchema = {
  type: "object" as const,
  required: ["id", "date", "slug", "status", "title", "content", "author"],
  properties: {
    id: { type: "integer" },
    date: { type: "string", format: "date-time" },
    modified: { type: "string", format: "date-time" },
    slug: { type: "string" },
    status: {
      type: "string",
      enum: ["publish", "future", "draft", "pending", "private", "trash"],
    },
    title: RenderedFieldSchema,
    content: RenderedFieldSchema,
    excerpt: RenderedFieldSchema,
    author: { type: "integer" },
    parent: {
      type: ["integer", "null"],
      description: "Parent post/page ID (null for root-level content)",
    },
    menu_order: { type: "integer", description: "Menu order (default 0)" },
    categories: {
      type: "array",
      items: { type: "integer" },
      description: "Array of category term IDs",
    },
    tags: {
      type: "array",
      items: { type: "integer" },
      description: "Array of tag term IDs",
    },
    _nodepress: {
      type: "object",
      properties: {
        type: { type: "string" },
        parent_id: { type: ["integer", "null"] },
        menu_order: { type: "integer" },
        meta: { type: "object", additionalProperties: true },
      },
    },
  },
};

export const PostCreateBodySchema = {
  type: "object" as const,
  required: ["title", "content"],
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    status: {
      type: "string",
      enum: ["publish", "future", "draft", "pending", "private"],
      default: "draft",
    },
    excerpt: { type: "string" },
    slug: { type: "string" },
    categories: {
      type: "array",
      items: { type: "integer" },
      description: "Array of category term IDs to assign",
    },
    tags: {
      type: "array",
      items: { type: "integer" },
      description: "Array of tag term IDs to assign",
    },
  },
};

export const PostUpdateBodySchema = {
  type: "object" as const,
  properties: {
    title: { type: "string" },
    content: { type: "string" },
    status: {
      type: "string",
      enum: ["publish", "future", "draft", "pending", "private", "trash"],
    },
    excerpt: { type: "string" },
    slug: { type: "string" },
    categories: {
      type: "array",
      items: { type: "integer" },
      description: "Array of category term IDs to assign (replaces existing)",
    },
    tags: {
      type: "array",
      items: { type: "integer" },
      description: "Array of tag term IDs to assign (replaces existing)",
    },
  },
};

export const ErrorResponseSchema = {
  type: "object" as const,
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    data: {
      type: "object",
      properties: {
        status: { type: "integer" },
      },
    },
  },
};
