import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { getHome, getPost } from "./handlers.js";

export default fp(async (app: FastifyInstance) => {
  // GET / — Home page with list of published posts (public)
  app.get("/", getHome);

  // GET /p/:slug — Single post page (public)
  app.get("/p/:slug", getPost);
});
