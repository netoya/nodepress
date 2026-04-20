import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { eq } from "drizzle-orm";
import type { AuthenticatedUser } from "../../auth/types.js";
import { db, users, posts } from "@nodepress/db";
import { hash as hashPassword } from "../../services/password.js";

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

  // Fetch all users to count total (required for X-WP-Total header)
  const allUsers = await db.select().from(users);
  const totalUsers = allUsers.length;
  const totalPages = Math.ceil(totalUsers / perPage);

  // Fetch paginated users from DB using LIMIT/OFFSET
  const offset = (page - 1) * perPage;
  const paginatedUsers = await db
    .select()
    .from(users)
    .limit(perPage)
    .offset(offset);

  // Serialize to WP public shape (no email)
  const wpUsers = paginatedUsers.map(toWpUserPublic);

  // Add pagination headers (WP convention)
  await reply
    .status(200)
    .header("X-WP-Total", totalUsers.toString())
    .header("X-WP-TotalPages", totalPages.toString())
    .send(wpUsers);
}

async function getUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);

  const [user] = await db.select().from(users).where(eq(users.id, id));

  if (!user) {
    await reply
      .status(404)
      .send({ code: "NOT_FOUND", message: `User ${id} not found.` });
    return;
  }

  await reply.status(200).send(toWpUserPublic(user));
}

async function createUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const body = request.body as Record<string, unknown>;

  const username = body["username"] as string | undefined;
  const email = body["email"] as string | undefined;
  const password = body["password"] as string | undefined;
  const displayName = (body["displayName"] as string | undefined) ?? "";
  const roles = (body["roles"] as string[] | undefined) ?? ["subscriber"];

  if (!username || !email || !password) {
    await reply.status(422).send({
      code: "INVALID_REQUEST",
      message: "Fields username, email, and password are required.",
    });
    return;
  }

  if (password.length < 1) {
    await reply.status(422).send({
      code: "INVALID_REQUEST",
      message: "Password must not be empty.",
    });
    return;
  }

  // Hash password — plaintext is discarded after this call (ADR-026)
  const passwordHash = await hashPassword(password);

  try {
    const [created] = await db
      .insert(users)
      .values({
        login: username,
        email,
        displayName,
        passwordHash,
        roles,
      })
      .returning();

    // Password and passwordHash NEVER in response (ADR-026 §2)
    await reply.status(201).send(toWpUser(created!));
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      await reply.status(409).send({
        code: "USER_EXISTS",
        message: "A user with that username or email already exists.",
      });
      return;
    }
    throw err;
  }
}

async function updateUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const body = request.body as Record<string, unknown>;

  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing) {
    await reply
      .status(404)
      .send({ code: "NOT_FOUND", message: `User ${id} not found.` });
    return;
  }

  const updateData: Record<string, unknown> = {};

  if ("displayName" in body) updateData["displayName"] = body["displayName"];
  if ("email" in body) updateData["email"] = body["email"];
  if ("roles" in body) updateData["roles"] = body["roles"];
  if ("capabilities" in body) updateData["capabilities"] = body["capabilities"];

  // Rotate hash ONLY when password is explicitly provided (ADR-026 §3)
  if ("password" in body) {
    const pw = body["password"] as string;
    if (!pw || pw.length < 1) {
      await reply.status(422).send({
        code: "INVALID_REQUEST",
        message: "Password must not be empty.",
      });
      return;
    }
    updateData["passwordHash"] = await hashPassword(pw);
  }
  // If "password" is absent from body — do NOT touch passwordHash

  if (Object.keys(updateData).length === 0) {
    // No-op: return current user shape unchanged
    await reply.status(200).send(toWpUser(existing));
    return;
  }

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, id))
    .returning();

  // Password and passwordHash NEVER in response (ADR-026 §2)
  await reply.status(200).send(toWpUser(updated!));
}

async function deleteUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const params = request.params as Record<string, unknown>;
  const query = request.query as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const reassignParam = query["reassign"] as string | undefined;

  const [existing] = await db.select().from(users).where(eq(users.id, id));
  if (!existing) {
    await reply
      .status(404)
      .send({ code: "NOT_FOUND", message: `User ${id} not found.` });
    return;
  }

  if (!reassignParam) {
    // Check whether this user has authored posts
    const authoredPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, id));

    if (authoredPosts.length > 0) {
      await reply.status(409).send({
        code: "USER_HAS_CONTENT",
        message: `User ${id} has ${authoredPosts.length} post(s). Provide ?reassign=<userId> to reassign them before deletion.`,
      });
      return;
    }

    // No posts — safe to delete
    await db.delete(users).where(eq(users.id, id));
    await reply
      .status(200)
      .send({ deleted: true, previous: toWpUserPublic(existing) });
    return;
  }

  const reassignId = parseInt(reassignParam, 10);

  // Reassign posts and delete user in a single transaction (ADR-026 §4)
  await db.transaction(async (tx) => {
    await tx
      .update(posts)
      .set({ authorId: reassignId })
      .where(eq(posts.authorId, id));

    await tx.delete(users).where(eq(users.id, id));
  });

  await reply
    .status(200)
    .send({ deleted: true, previous: toWpUserPublic(existing) });
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
          },
        },
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
  // NOTE: /me must be registered before /:id so Fastify doesn't treat "me" as an integer id.
  app.get(
    "/wp/v2/users/me",
    {
      preHandler: [app.requireAuth],
    },
    getMeHandler,
  );

  // GET /wp/v2/users/:id — Public user profile (no email). 404 if not found.
  app.get("/wp/v2/users/:id", getUserHandler);

  // POST /wp/v2/users — Create user. Requires admin. Password hashed at cost 12 (ADR-026).
  app.post(
    "/wp/v2/users",
    { preHandler: [app.requireAdmin] },
    createUserHandler,
  );

  // PUT /wp/v2/users/:id — Update user. Requires admin. Hash rotates only when password is explicit.
  app.put(
    "/wp/v2/users/:id",
    { preHandler: [app.requireAdmin] },
    updateUserHandler,
  );

  // DELETE /wp/v2/users/:id — Delete user. Requires admin.
  // ?reassign=<userId> required when user has posts (transaction-safe, ADR-026 §4).
  app.delete(
    "/wp/v2/users/:id",
    { preHandler: [app.requireAdmin] },
    deleteUserHandler,
  );
});
