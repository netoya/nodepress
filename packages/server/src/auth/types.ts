/**
 * Represents an authenticated user injected into the Fastify request.
 * Sprint 1: simplified — Bearer token grants admin role only.
 * Sprint 2+: extend with real capability checks.
 */
export interface AuthenticatedUser {
  role: "admin";
  /** Optional user id — not populated in simplified auth (sprint 1) */
  id?: string;
}

/**
 * Augment Fastify's request interface so routes can access `req.user`
 * after the bearer decorator runs.
 */
declare module "fastify" {
  interface FastifyRequest {
    /**
     * Populated by the `bearerAuth` decorator when a valid token is present.
     * Undefined on public routes that do not require authentication.
     */
    user?: AuthenticatedUser;
  }
}
