import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import type { AuthenticatedUser } from "../../auth/types.js";
import { db, users } from "@nodepress/db";

/**
 * WP REST API-compatible user object shape returned by /wp/v2/users and /wp/v2/users/me.
 * Fields mapped from the users table. Fields absent from our schema
 * (url, description, link, locale, nickname) are returned as empty strings
 * or sensible defaults for WP client compatibility.
 */
interface WpUser {
  id: number;
  name: string;
  slug: string;
  email: string;
  url: string;
  description: string;
  link: string;
  locale: string;
  nickname: string;
  registered_date: string;
  roles: string[];
  capabilities: Record<string, unknown>;
  _nodepress: {
    login: string;
  };
}

/**
 * WP REST API-compatible user object for public listing (/wp/v2/users).
 * Public listing omits the email field per WP behavior.
 */
interface WpUserPublic {
  id: number;
  name: string;
  slug: string;
  url: string;
  description: string;
  link: string;
  avatar_urls: Record<string, string>;
  _links: Record<string, unknown>;
}

/**
 * Serialize a user row to WP public listing shape (without email).
 */
function toWpUserPublic(u: typeof users.$inferSelect): WpUserPublic {
  return {
    id: u.id,
    name: u.displayName || u.login,
    slug: u.login,
    url: "",
    description: "",
    link: "",
    avatar_urls: {
      "24": "",
      "48": "",
      "96": "",
    },
    _links: {},
  };
}

/**
 * Serialize an authenticated user to WP full shape (with email, for authenticated contexts).
 * Accepts AuthenticatedUser (from request.user) or database row.
 */
function toWpUser(u: AuthenticatedUser | typeof users.$inferSelect): WpUser {
  const capabilities =
    typeof u.capabilities === "object" && u.capabilities !== null
      ? (u.capabilities as Record<string, unknown>)
      : {};

  return {
    id: u.id,
    name: u.displayName || u.login,
    slug: u.login,
    email: u.email,
    url: "",
    description: "",
    link: "",
    locale: "en_US",
    nickname: u.displayName || u.login,
    // registered_date: use creation timestamp if available (from DB row),
    // otherwise use Unix epoch for authenticated users (doesn't have createdAt)
    registered_date:
      "createdAt" in u
        ? (u as typeof users.$inferSelect).createdAt.toISOString()
        : new Date(0).toISOString(),
    roles: u.roles,
    capabilities,
    _nodepress: {
      login: u.login,
    },
  };
}

async function listUsersHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Parse pagination params
  const query = request.query as Record<string, unknown>;
  const page = Math.max(1, parseInt((query["page"] as string) ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt((query["per_page"] as string) ?? "10", 10)),
  );

  // Fetch all users (no DB filter in this PoC — would add WHERE in production)
  const allUsers = await db.select().from(users);

  // Apply pagination
  const offset = (page - 1) * perPage;
  const paginatedUsers = allUsers.slice(offset, offset + perPage);

  // Calculate total pages
  const totalUsers = allUsers.length;
  const totalPages = Math.ceil(totalUsers / perPage);

  // Serialize to WP public shape (no email)
  const wpUsers = paginatedUsers.map(toWpUserPublic);

  // Add pagination headers (WP convention)
  await reply
    .status(200)
    .header("X-WP-Total", totalUsers.toString())
    .header("X-WP-TotalPages", totalPages.toString())
    .send(wpUsers);
}

async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // request.user is guaranteed by requireAuth preHandler
  const u = request.user!;

  const wpUser = toWpUser(u);

  await reply.status(200).send(wpUser);
}

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/users — List all users (public, no email exposed)
  // Supports pagination: ?page=1&per_page=10
  app.get(
    "/wp/v2/users",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "number" },
                name: { type: "string" },
                slug: { type: "string" },
                url: { type: "string" },
                description: { type: "string" },
                link: { type: "string" },
                avatar_urls: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
                _links: { type: "object" },
              },
            },
          },
        },
      },
    },
    listUsersHandler,
  );

  // GET /wp/v2/users/me — Returns the currently authenticated user.
  // Requires a valid Bearer token (any authenticated user, not just admin).
  app.get(
    "/wp/v2/users/me",
    {
      preHandler: [app.requireAuth],
    },
    getMeHandler,
  );
});
