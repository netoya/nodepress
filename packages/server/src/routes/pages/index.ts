import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { createPostHandler } from "../posts/handler-factory.js";
import { ErrorResponseSchema } from "../posts/schemas.js";

const handlers = createPostHandler("page");

/**
 * Page Schema — extends PostSchema with parent and menu_order at root level.
 * WP-compat: pages expose parent (integer | null) and menu_order (integer) in response root.
 */
const PageSchema = {
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
    title: {
      type: "object",
      required: ["rendered"],
      properties: {
        rendered: { type: "string" },
        raw: { type: "string" },
        protected: { type: "boolean" },
      },
    },
    content: {
      type: "object",
      required: ["rendered"],
      properties: {
        rendered: { type: "string" },
        raw: { type: "string" },
        protected: { type: "boolean" },
      },
    },
    excerpt: {
      type: "object",
      required: ["rendered"],
      properties: {
        rendered: { type: "string" },
        raw: { type: "string" },
        protected: { type: "boolean" },
      },
    },
    author: { type: "integer" },
    parent: {
      type: ["integer", "null"],
      description: "Parent page ID (null if root)",
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

/**
 * Page Create Body Schema — extends PostCreateBodySchema with parent and menu_order.
 */
const PageCreateBodySchema = {
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
    parent: { type: "integer", description: "Parent page ID (optional)" },
    menu_order: {
      type: "integer",
      description: "Menu order (default 0)",
      default: 0,
    },
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

/**
 * Page Update Body Schema — same as PostUpdateBodySchema plus parent and menu_order.
 */
const PageUpdateBodySchema = {
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
    parent: { type: "integer", description: "Parent page ID (optional)" },
    menu_order: { type: "integer", description: "Menu order (optional)" },
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

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/pages — List pages (public)
  app.get(
    "/wp/v2/pages",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            per_page: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
            search: { type: "string" },
            status: {
              type: "string",
              enum: [
                "publish",
                "draft",
                "pending",
                "private",
                "trash",
                "future",
              ],
              default: "publish",
            },
            context: {
              type: "string",
              enum: ["view", "edit"],
              default: "view",
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: PageSchema,
          },
        },
      },
    },
    handlers.listPosts,
  );

  // GET /wp/v2/pages/:id — Get single page (public)
  app.get(
    "/wp/v2/pages/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            context: {
              type: "string",
              enum: ["view", "edit"],
              default: "view",
            },
          },
        },
        response: {
          200: PageSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    handlers.getPost,
  );

  // POST /wp/v2/pages — Create page (admin required)
  app.post(
    "/wp/v2/pages",
    {
      preHandler: [app.requireAdmin],
      schema: {
        body: PageCreateBodySchema,
        response: {
          201: PageSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    handlers.createPost,
  );

  // PUT /wp/v2/pages/:id — Update page (admin required)
  app.put(
    "/wp/v2/pages/:id",
    {
      preHandler: [app.requireAdmin],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        body: PageUpdateBodySchema,
        response: {
          200: PageSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    handlers.updatePost,
  );

  // DELETE /wp/v2/pages/:id — Delete page (admin required)
  app.delete(
    "/wp/v2/pages/:id",
    {
      preHandler: [app.requireAdmin],
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        querystring: {
          type: "object",
          properties: {
            force: { type: "boolean", default: false },
          },
        },
        response: {
          200: {
            oneOf: [
              PageSchema,
              {
                type: "object",
                required: ["deleted", "previous"],
                properties: {
                  deleted: { type: "boolean" },
                  previous: PageSchema,
                },
              },
            ],
          },
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    handlers.deletePost,
  );
});
