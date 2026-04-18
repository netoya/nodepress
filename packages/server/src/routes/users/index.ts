import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

/**
 * WP REST API-compatible user object shape returned by /wp/v2/users/me.
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

async function getMeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // request.user is guaranteed by requireAuth preHandler
  const u = request.user!;

  const wpUser: WpUser = {
    id: u.id,
    name: u.displayName || u.login,
    slug: u.login,
    email: u.email,
    url: "",
    description: "",
    link: "",
    locale: "en_US",
    nickname: u.displayName || u.login,
    // registered_date not stored per-user in this schema — omit with empty ISO
    registered_date: new Date(0).toISOString(),
    roles: u.roles,
    capabilities: u.capabilities,
    _nodepress: {
      login: u.login,
    },
  };

  await reply.status(200).send(wpUser);
}

export default fp(async (app: FastifyInstance) => {
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
