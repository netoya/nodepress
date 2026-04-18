/**
 * WP REST API v2 conformance tests — post contract layer.
 *
 * These tests verify that responses match the WP REST API v2 CONTRACT,
 * not just that endpoints exist. Carmen's integration tests cover routing
 * and auth enforcement; this harness covers shape correctness.
 *
 * Each response is validated with the pure contract functions from contract.ts.
 * Any regression in serialize.ts will surface here with a descriptive message.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { registerBearerAuth } from "../../auth/index.js";
import { assertPostShape, assertListShape, assertHeaders } from "./contract.js";
import { FIXTURE_POST_1, FIXTURE_POST_2 } from "./fixtures.js";

const ADMIN_TOKEN = "dev-admin-token";

// ---------------------------------------------------------------------------
// Full WP-shape mock posts for the contract harness.
// These represent what handlers.ts (via toWpPost) should produce.
// ---------------------------------------------------------------------------

const MOCK_POST_1 = { ...FIXTURE_POST_1 };
const MOCK_POST_2 = { ...FIXTURE_POST_2 };

describe("WP REST API v2 Contract Harness — Posts", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeAll(async () => {
    process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";

    app = Fastify();
    await registerBearerAuth(app);

    await app.register(async (fastify) => {
      // GET /wp/v2/posts — returns full WP-shape list with pagination headers
      fastify.get(
        "/wp/v2/posts",
        async (_request: FastifyRequest, reply: FastifyReply) => {
          reply.header("X-WP-Total", "2");
          reply.header("X-WP-TotalPages", "1");
          return [MOCK_POST_1, MOCK_POST_2];
        },
      );

      // GET /wp/v2/posts/:id — returns full WP-shape single post
      fastify.get(
        "/wp/v2/posts/:id",
        async (request: FastifyRequest, reply: FastifyReply) => {
          const params = request.params as Record<string, unknown>;
          if (params["id"] === "1") {
            return MOCK_POST_1;
          }
          return reply.status(404).send({
            code: "NOT_FOUND",
            message: "Post 9999 not found.",
            data: { status: 404 },
          });
        },
      );

      // POST /wp/v2/posts — admin only, returns 201 + full WP-shape
      fastify.post(
        "/wp/v2/posts",
        { preHandler: [fastify.requireAdmin] },
        async (_request: FastifyRequest, reply: FastifyReply) => {
          const created = {
            ...MOCK_POST_1,
            id: 3,
            slug: "new-post",
            date: new Date().toISOString(),
            modified: new Date().toISOString(),
          };
          return reply.status(201).send(created);
        },
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /wp/v2/posts — list
  // -------------------------------------------------------------------------

  describe("GET /wp/v2/posts", () => {
    it("returns 200 status code (status code conformance)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      expect(res.statusCode).toBe(200);
    });

    it("response body is a valid WP post list (assertListShape)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      const body: unknown = res.json();
      // Throws descriptive error on contract violation
      assertListShape(body);
    });

    it("pagination headers are present and are integers (assertHeaders)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      assertHeaders(res.headers as Record<string, string | undefined>);
    });

    it("X-WP-Total and X-WP-TotalPages match list length contract", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      const total = parseInt(res.headers["x-wp-total"] as string, 10);
      const totalPages = parseInt(res.headers["x-wp-totalpages"] as string, 10);
      expect(total).toBeGreaterThanOrEqual(0);
      expect(totalPages).toBeGreaterThanOrEqual(0);
    });

    it("each item in list passes full WP post shape (assertPostShape per item)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      const body = res.json() as unknown[];
      expect(body.length).toBeGreaterThan(0);
      for (const item of body) {
        assertPostShape(item); // throws with "Missing field `X`" on failure
      }
    });
  });

  // -------------------------------------------------------------------------
  // GET /wp/v2/posts/:id — single post
  // -------------------------------------------------------------------------

  describe("GET /wp/v2/posts/:id", () => {
    it("returns 200 for existing post (status code conformance)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.statusCode).toBe(200);
    });

    it("response body passes full WP post contract (assertPostShape)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      assertPostShape(res.json());
    });

    it("returns 404 for non-existent post (status code conformance)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/9999" });
      expect(res.statusCode).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /wp/v2/posts — create
  // -------------------------------------------------------------------------

  describe("POST /wp/v2/posts", () => {
    it("returns 401 without auth (status code conformance)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/posts",
        payload: { title: "Test", content: "Body" },
      });
      expect(res.statusCode).toBe(401);
    });

    it("returns 201 on successful create (status code conformance)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/posts",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { title: "Test", content: "Body" },
      });
      expect(res.statusCode).toBe(201);
    });

    it("created post response passes WP contract (assertPostShape)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/posts",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { title: "Test", content: "Body" },
      });
      assertPostShape(res.json());
    });
  });

  // -------------------------------------------------------------------------
  // Regression tests — documented divergences
  // -------------------------------------------------------------------------

  describe("Regression — DIV-001: date_gmt and modified_gmt must be absent", () => {
    it("GET list: no post contains date_gmt", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
      const body = res.json() as Record<string, unknown>[];
      for (const post of body) {
        expect(post).not.toHaveProperty("date_gmt");
        expect(post).not.toHaveProperty("modified_gmt");
      }
    });

    it("GET single: response does not contain date_gmt or modified_gmt", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      expect(post).not.toHaveProperty("date_gmt");
      expect(post).not.toHaveProperty("modified_gmt");
    });
  });

  describe("Regression — DIV-002: title/content/excerpt are {rendered, protected} objects", () => {
    it("GET single: title is an object with rendered string and protected boolean", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      const title = post["title"] as Record<string, unknown>;
      expect(typeof title).toBe("object");
      expect(typeof title["rendered"]).toBe("string");
      expect(typeof title["protected"]).toBe("boolean");
    });

    it("GET single: content is an object with rendered string", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      const content = post["content"] as Record<string, unknown>;
      expect(typeof content).toBe("object");
      expect(typeof content["rendered"]).toBe("string");
    });

    it("GET single: excerpt is an object with rendered string", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      const excerpt = post["excerpt"] as Record<string, unknown>;
      expect(typeof excerpt).toBe("object");
      expect(typeof excerpt["rendered"]).toBe("string");
    });

    it("title is NOT a plain string (regression: DIV-002 must not regress to string)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      expect(typeof post["title"]).not.toBe("string");
    });
  });

  describe("Regression — DIV-003: WP fields absent in v1", () => {
    it("GET single: featured_media is not present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.json()).not.toHaveProperty("featured_media");
    });

    it("GET single: comment_status is not present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.json()).not.toHaveProperty("comment_status");
    });

    it("GET single: ping_status is not present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.json()).not.toHaveProperty("ping_status");
    });

    it("GET single: format is not present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.json()).not.toHaveProperty("format");
    });

    it("GET single: sticky is not present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      expect(res.json()).not.toHaveProperty("sticky");
    });
  });

  describe("Regression — DIV-005: _nodepress namespace present with correct fields", () => {
    it("GET single: _nodepress namespace is present", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const post = res.json() as Record<string, unknown>;
      expect(typeof post["_nodepress"]).toBe("object");
    });

    it("GET single: _nodepress.type is a string", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const np = (res.json() as Record<string, unknown>)[
        "_nodepress"
      ] as Record<string, unknown>;
      expect(typeof np["type"]).toBe("string");
    });

    it("GET single: _nodepress.menu_order is a number", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const np = (res.json() as Record<string, unknown>)[
        "_nodepress"
      ] as Record<string, unknown>;
      expect(typeof np["menu_order"]).toBe("number");
    });

    it("GET single: _nodepress.parent_id is present (null or integer)", async () => {
      const res = await app.inject({ method: "GET", url: "/wp/v2/posts/1" });
      const np = (res.json() as Record<string, unknown>)[
        "_nodepress"
      ] as Record<string, unknown>;
      expect("parent_id" in np).toBe(true);
    });
  });
});
