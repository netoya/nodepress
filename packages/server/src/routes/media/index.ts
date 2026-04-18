import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/media — List media (public stub).
  // Returns empty array. File uploads not implemented in Sprint 1.
  app.get(
    "/wp/v2/media",
    {
      schema: {
        response: {
          200: {
            type: "array",
            items: {
              type: "object",
            },
          },
        },
      },
    },
    async (_request, reply) => {
      reply.code(200).send([]);
    },
  );
});
