import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
 * Fastify preHandler hook that enforces Bearer token authentication.
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

  const user: AuthenticatedUser = { role: "admin" };
  request.user = user;
}

/**
 * Registers the `requireAdmin` hook on a Fastify instance so routes can
 * reference it via the plugin's closure. Call once during server bootstrap.
 *
 * ```ts
 * await registerBearerAuth(server);
 * // Then in route definitions:
 * server.post('/admin/endpoint', { preHandler: [server.requireAdmin] }, handler);
 * ```
 */
export async function registerBearerAuth(app: FastifyInstance): Promise<void> {
  // Decorate so routes can reference it from the app instance if desired.
  app.decorate("requireAdmin", requireAdmin);
}

// Extend FastifyInstance type for the decorator
declare module "fastify" {
  interface FastifyInstance {
    requireAdmin: typeof requireAdmin;
  }
}
