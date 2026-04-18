import { describe, it, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth } from "../../../auth/index.js";
import { requireAdmin } from "../../../auth/bearer.js";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SerializeContext } from "../serialize.js";

/**
 * Tests for ?context=edit auth enforcement at the HTTP layer (ADR-009).
 * Verifies that:
 *  - GET /wp/v2/posts?context=edit returns 401 without token
 *  - GET /wp/v2/posts?context=edit returns 200 with admin token
 *  - GET /wp/v2/posts/:id?context=edit returns 401 without token
 *  - GET /wp/v2/posts/:id?context=edit returns 200 with admin token
 *  - context=view (default) is always public (no auth required)
 */

const ADMIN_TOKEN = "dev-admin-token";

describe("?context=edit — auth enforcement (ADR-009)", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeAll(async () => {
    app = Fastify();
    await registerBearerAuth(app);

    await app.register(async (fastify: any) => {
      // Simulate the handler logic: context=edit requires admin
      fastify.get(
        "/wp/v2/posts",
        async (request: FastifyRequest, reply: FastifyReply) => {
          const query = request.query as Record<string, unknown>;
          const rawContext = (query["context"] as string) ?? "view";
          if (rawContext === "edit") {
            await requireAdmin(request, reply);
            if (reply.sent) return;
          }
          const context: SerializeContext =
            rawContext === "edit" ? "edit" : "view";
          return reply.send({ context, items: [] });
        },
      );

      fastify.get(
        "/wp/v2/posts/:id",
        async (request: FastifyRequest, reply: FastifyReply) => {
          const query = request.query as Record<string, unknown>;
          const rawContext = (query["context"] as string) ?? "view";
          if (rawContext === "edit") {
            await requireAdmin(request, reply);
            if (reply.sent) return;
          }
          const context: SerializeContext =
            rawContext === "edit" ? "edit" : "view";
          return reply.send({ context, id: 1 });
        },
      );
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /wp/v2/posts?context=edit", () => {
    it("returns 401 without Bearer token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts?context=edit",
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).code).toBe("UNAUTHORIZED");
    });

    it("returns 401 with wrong Bearer token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts?context=edit",
        headers: { Authorization: "Bearer wrong-token" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 200 with valid admin token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts?context=edit",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).context).toBe("edit");
    });
  });

  describe("GET /wp/v2/posts?context=view (default)", () => {
    it("returns 200 without any auth token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts",
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).context).toBe("view");
    });

    it("returns 200 with explicit context=view without token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts?context=view",
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /wp/v2/posts/:id?context=edit", () => {
    it("returns 401 without Bearer token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts/1?context=edit",
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 200 with valid admin token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/posts/1?context=edit",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).context).toBe("edit");
    });
  });
});
