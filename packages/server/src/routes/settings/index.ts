import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { SettingsService, type SettingsShape } from "./service.js";

const settingsService = new SettingsService();

/**
 * Settings Schema — WP-compatible settings object.
 * Response shape matches /wp/v2/settings in WordPress REST API.
 */
const SettingsSchema = {
  type: "object" as const,
  properties: {
    title: { type: "string", description: "Site title" },
    description: { type: "string", description: "Site description/tagline" },
    url: { type: "string", description: "Site URL" },
    email: { type: "string", description: "Admin email address" },
    posts_per_page: {
      type: "integer",
      description: "Number of posts per page (archive)",
    },
    default_category: {
      type: "integer",
      description: "Default post category ID",
    },
  },
};

const ErrorResponseSchema = {
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

/**
 * GET /wp/v2/settings — Retrieve current site settings.
 * Public endpoint (no auth required).
 */
async function getSettings(_request: FastifyRequest, _reply: FastifyReply) {
  return await settingsService.getSettings();
}

/**
 * PUT /wp/v2/settings — Update site settings.
 * Requires admin authentication.
 * Only whitelisted keys (title, description, url, email, posts_per_page, default_category)
 * are processed; others are silently ignored.
 */
async function updateSettings(request: FastifyRequest, _reply: FastifyReply) {
  const body = request.body as Partial<SettingsShape>;
  await settingsService.updateSettings(body);
  return await settingsService.getSettings();
}

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/settings — Read settings (public)
  app.get(
    "/wp/v2/settings",
    {
      schema: {
        response: {
          200: SettingsSchema,
        },
      },
    },
    getSettings,
  );

  // PUT /wp/v2/settings — Update settings (admin required)
  app.put(
    "/wp/v2/settings",
    {
      preHandler: [app.requireAdmin],
      schema: {
        body: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            url: { type: "string" },
            email: { type: "string" },
            posts_per_page: { type: "integer" },
            default_category: { type: "integer" },
          },
        },
        response: {
          200: SettingsSchema,
          401: ErrorResponseSchema,
        },
      },
    },
    updateSettings,
  );
});
