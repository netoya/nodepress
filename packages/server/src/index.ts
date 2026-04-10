import Fastify from "fastify";

const server = Fastify({ logger: true });

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
