/**
 * Represents an authenticated user injected into the Fastify request.
 * Sprint 3: populated from DB — includes roles and capabilities from users table.
 */
export interface AuthenticatedUser {
  /** Database primary key */
  id: number;
  login: string;
  email: string;
  displayName: string;
  roles: string[];
  capabilities: Record<string, unknown>;
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
