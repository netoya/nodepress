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
