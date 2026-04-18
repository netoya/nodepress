import Fastify from "fastify";
import { registerBearerAuth } from "./auth/index.js";
import postsPlugin from "./routes/posts/index.js";

const server = Fastify({ logger: true });

// Register the bearer auth decorator.
// Routes that require admin should use:  { preHandler: [server.requireAdmin] }
// Public routes (e.g. GET /wp/v2/posts) omit the preHandler entirely.
await registerBearerAuth(server);

// Register the posts plugin
await server.register(postsPlugin);

server.get("/", async () => {
  return "Hello NodePress";
});

const port = Number(process.env["PORT"] ?? 3000);

try {
  await server.listen({ port, host: "0.0.0.0" });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
