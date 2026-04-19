import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "./handlers.js";
import {
  PostCreateBodySchema,
  PostUpdateBodySchema,
  PostSchema,
  ErrorResponseSchema,
} from "./schemas.js";

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/posts — List posts (public)
  app.get(
    "/wp/v2/posts",
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
            items: PostSchema,
          },
        },
      },
    },
    listPosts,
  );

  // GET /wp/v2/posts/:id — Get single post (public)
  app.get(
    "/wp/v2/posts/:id",
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
          200: PostSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    getPost,
  );

  // POST /wp/v2/posts — Create post (admin required)
  app.post(
    "/wp/v2/posts",
    {
      preHandler: [app.requireAdmin],
      schema: {
        body: PostCreateBodySchema,
        response: {
          201: PostSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    createPost,
  );

  // PUT /wp/v2/posts/:id — Update post (admin required)
  app.put(
    "/wp/v2/posts/:id",
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
        body: PostUpdateBodySchema,
        response: {
          200: PostSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    updatePost,
  );

  // DELETE /wp/v2/posts/:id — Delete post (admin required)
  app.delete(
    "/wp/v2/posts/:id",
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
              PostSchema,
              {
                type: "object",
                required: ["deleted", "previous"],
                properties: {
                  deleted: { type: "boolean" },
                  previous: PostSchema,
                },
              },
            ],
          },
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    deletePost,
  );
});
