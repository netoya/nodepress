import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import {
  listPlugins,
  getPlugin,
  createPlugin,
  deletePlugin,
} from "./handlers.js";

/**
 * JSON Schema for PluginRegistryEntry response
 */
const PluginEntrySchema = {
  type: "object" as const,
  required: ["slug", "name", "version", "status"],
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    version: { type: "string" },
    status: { type: "string" },
    author: { type: ["string", "null"] },
    registryUrl: { type: ["string", "null"] },
    tarballUrl: { type: ["string", "null"] },
    publishedAt: { type: ["string", "null"], format: "date-time" },
    activatedAt: { type: ["string", "null"], format: "date-time" },
    errorLog: { type: ["string", "null"] },
    meta: { type: "object", additionalProperties: true },
  },
};

const ErrorResponseSchema = {
  type: "object" as const,
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    data: { type: "object", additionalProperties: true },
  },
};

const PostPluginBodySchema = {
  type: "object" as const,
  required: ["slug", "name", "version"],
  properties: {
    slug: { type: "string" },
    name: { type: "string" },
    version: { type: "string" },
    author: { type: ["string", "null"] },
    registryUrl: { type: ["string", "null"] },
    tarballUrl: { type: ["string", "null"] },
    publishedAt: { type: ["string", "null"] },
    meta: { type: "object", additionalProperties: true },
  },
};

/**
 * Plugin Registry REST API routes.
 * Exports Fastify plugin for registration in the main server.
 */
export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/plugins — List plugins (public)
  app.get(
    "/wp/v2/plugins",
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
            status: {
              type: "string",
              enum: ["active", "inactive", "all"],
            },
            q: {
              type: "string",
              description: "Full-text search on plugin name and description",
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: PluginEntrySchema,
          },
        },
      },
    },
    listPlugins,
  );

  // GET /wp/v2/plugins/:slug — Get single plugin (public)
  app.get(
    "/wp/v2/plugins/:slug",
    {
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: { type: "string" },
          },
        },
        response: {
          200: PluginEntrySchema,
          404: ErrorResponseSchema,
        },
      },
    },
    getPlugin,
  );

  // POST /wp/v2/plugins — Create/register plugin (admin required)
  app.post(
    "/wp/v2/plugins",
    {
      preHandler: [app.requireAdmin],
      schema: {
        body: PostPluginBodySchema,
        response: {
          201: PluginEntrySchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          409: ErrorResponseSchema,
        },
      },
    },
    createPlugin,
  );

  // DELETE /wp/v2/plugins/:slug — Uninstall plugin (admin required)
  app.delete(
    "/wp/v2/plugins/:slug",
    {
      preHandler: [app.requireAdmin],
      schema: {
        params: {
          type: "object",
          required: ["slug"],
          properties: {
            slug: { type: "string" },
          },
        },
        response: {
          200: PluginEntrySchema,
          401: ErrorResponseSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    deletePlugin,
  );
});
