import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db, users } from "@nodepress/db";
import { eq } from "drizzle-orm";
import type { AuthenticatedUser } from "./types.js";

/**
 * The default token used in development when NODEPRESS_ADMIN_TOKEN is not set.
 * NEVER use this value in production.
 */
const DEV_TOKEN = "dev-admin-token";

/**
 * Returns the expected admin token from the environment, falling back to the
 * dev default when the env var is not set.
 */
function getAdminToken(): string {
  return process.env["NODEPRESS_ADMIN_TOKEN"] ?? DEV_TOKEN;
}

/**
 * Parses `Authorization: Bearer <token>` from a Fastify request.
 * Returns the token string or null if the header is absent / malformed.
 */
function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers["authorization"];
  if (typeof authHeader !== "string") return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

/**
 * Exported for unit testing — resolves a login name to a DB user record.
 * Production code uses the module-level `db` singleton; tests mock @nodepress/db.
 *
 * Resolves the token to a DB user record.
 *
 * Current token scheme: opaque shared secret mapped via NODEPRESS_ADMIN_TOKEN.
 * The token does not carry a user ID, so we look up the first user whose login
 * matches NODEPRESS_ADMIN_USER (default: "admin"). This is intentionally simple
 * for the PoC — Sprint 4+ will introduce per-user JWT or session tokens.
 *
 * Returns null if the user cannot be found.
 */
async function resolveUserFromToken(
  dbInstance: typeof db,
): Promise<AuthenticatedUser | null> {
  const login = process.env["NODEPRESS_ADMIN_USER"] ?? "admin";
  const rows = await dbInstance
    .select()
    .from(users)
    .where(eq(users.login, login))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    login: row.login,
    email: row.email,
    displayName: row.displayName,
    roles: row.roles,
    capabilities: row.capabilities as Record<string, unknown>,
  };
}

/**
 * Fastify preHandler hook that enforces Bearer token authentication AND
 * verifies the resolved user has the 'administrator' role in the DB.
 *
 * Responds with 401 if the token is missing/invalid, 403 if the user exists
 * but lacks the administrator role.
 *
 * Usage — mark a route as requiring admin:
 * ```ts
 * server.post('/wp/v2/posts', { preHandler: [requireAdmin] }, handler);
 * ```
 *
 * Public routes (e.g. GET /wp/v2/posts) should NOT include this preHandler.
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token || token !== getAdminToken()) {
    await reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Valid Bearer token required",
    });
    return;
  }

  const user = await resolveUserFromToken(db);

  if (!user) {
    await reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Token user not found",
    });
    return;
  }

  if (!user.roles.includes("administrator")) {
    await reply.status(403).send({
      code: "FORBIDDEN",
      message: "Administrator role required",
    });
    return;
  }

  request.user = user;
}

/**
 * Fastify preHandler hook that enforces Bearer token authentication for any
 * authenticated user (not necessarily admin). Used for endpoints like
 * GET /wp/v2/users/me that require a valid token but no specific role.
 *
 * Responds with 401 if the token is missing/invalid or user not found.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const token = extractBearerToken(request);

  if (!token || token !== getAdminToken()) {
    await reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Valid Bearer token required",
    });
    return;
  }

  const user = await resolveUserFromToken(db);

  if (!user) {
    await reply.status(401).send({
      code: "UNAUTHORIZED",
      message: "Token user not found",
    });
    return;
  }

  request.user = user;
}

/**
 * Registers the `requireAdmin` and `requireAuth` hooks on a Fastify instance.
 * Call once during server bootstrap.
 *
 * ```ts
 * await registerBearerAuth(server);
 * // Then in route definitions:
 * server.post('/admin/endpoint', { preHandler: [server.requireAdmin] }, handler);
 * ```
 */
export async function registerBearerAuth(app: FastifyInstance): Promise<void> {
  app.decorate("requireAdmin", requireAdmin);
  app.decorate("requireAuth", requireAuth);
}

// Extend FastifyInstance type for the decorators
declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: typeof requireAdmin;
    requireAuth: typeof requireAuth;
  }
}
