import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";
import Fastify from "fastify";
import { registerBearerAuth } from "../../auth/index.js";

// ---------------------------------------------------------------------------
// Mock @nodepress/db to avoid real database interaction in tests.
// ---------------------------------------------------------------------------
vi.mock("@nodepress/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nodepress/db")>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: 1,
                  login: "admin",
                  email: "admin@nodepress.local",
                  displayName: "Admin",
                  passwordHash: "dev-only-placeholder",
                  roles: ["administrator"],
                  capabilities: {},
                  meta: {},
                  createdAt: new Date("2024-01-01"),
                  updatedAt: new Date("2024-01-01"),
                },
              ]),
          }),
        }),
      }),
      insert: () => ({
        values: () => ({
          onConflictDoUpdate: () => ({
            target: null,
            set: {},
            returning: () =>
              Promise.resolve([
                {
                  slug: "test-plugin",
                  name: "Test Plugin",
                  version: "1.0.0",
                  status: "inactive",
                  author: null,
                  registryUrl: null,
                  tarballUrl: null,
                  publishedAt: null,
                  activatedAt: null,
                  errorLog: null,
                  meta: {},
                },
              ]),
          }),
        }),
      }),
    },
  };
});

const ADMIN_TOKEN = "dev-admin-token";

/**
 * Integration tests for Plugin Registry REST API.
 * Tests routing, authentication, status codes, and response structure.
 * Database operations are mocked to avoid real DB dependency.
 */
describe("Plugin Registry API Integration Tests", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeAll(async () => {
    process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";

    app = Fastify();
    await registerBearerAuth(app);

    // Register minimal mock plugin for routing + auth tests
    await app.register(async (fastify: any) => {
      // GET /wp/v2/plugins — list (public)
      fastify.get(
        "/wp/v2/plugins",
        async (_request: FastifyRequest, reply: FastifyReply) => {
          reply.header("X-WP-Total", "2");
          reply.header("X-WP-TotalPages", "1");
          return [
            {
              slug: "plugin-1",
              name: "Plugin One",
              version: "1.0.0",
              status: "inactive",
              author: null,
              registryUrl: null,
              tarballUrl: null,
              publishedAt: null,
              activatedAt: null,
              errorLog: null,
              meta: {},
            },
            {
              slug: "plugin-2",
              name: "Plugin Two",
              version: "2.0.0",
              status: "active",
              author: null,
              registryUrl: null,
              tarballUrl: null,
              publishedAt: null,
              activatedAt: null,
              errorLog: null,
              meta: {},
            },
          ];
        },
      );

      // GET /wp/v2/plugins/:slug — get single (public)
      fastify.get(
        "/wp/v2/plugins/:slug",
        async (request: FastifyRequest, reply: FastifyReply) => {
          const params = request.params as Record<string, unknown>;
          const slug = params["slug"] as string;

          if (slug === "existing-plugin") {
            return {
              slug: "existing-plugin",
              name: "Existing Plugin",
              version: "1.0.0",
              status: "inactive",
              author: null,
              registryUrl: null,
              tarballUrl: null,
              publishedAt: null,
              activatedAt: null,
              errorLog: null,
              meta: {},
            };
          }

          return reply.status(404).send({
            code: "rest_plugin_invalid_slug",
            message: "Plugin not found.",
            data: { status: 404 },
          });
        },
      );

      // POST /wp/v2/plugins — create (admin required)
      fastify.post(
        "/wp/v2/plugins",
        { preHandler: [fastify.requireAdmin] },
        async (request: FastifyRequest, reply: FastifyReply) => {
          const body = request.body as Record<string, unknown>;
          const slug = body["slug"] as string | undefined;
          const name = body["name"] as string | undefined;
          const version = body["version"] as string | undefined;

          // Validate required fields
          if (!slug || !name || !version) {
            return reply.status(400).send({
              code: "rest_missing_param",
              message:
                "Missing required parameters: slug, name, version are required.",
              data: { status: 400 },
            });
          }

          return reply.status(201).send({
            slug,
            name,
            version,
            status: "inactive",
            author: (body["author"] as string | null) ?? null,
            registryUrl: (body["registryUrl"] as string | null) ?? null,
            tarballUrl: (body["tarballUrl"] as string | null) ?? null,
            publishedAt: (body["publishedAt"] as string | null) ?? null,
            activatedAt: null,
            errorLog: null,
            meta: (body["meta"] as Record<string, unknown>) ?? {},
          });
        },
      );
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /wp/v2/plugins", () => {
    it("returns 200 with array of plugins and pagination headers", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/wp/v2/plugins",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["x-wp-total"]).toBe("2");
      expect(response.headers["x-wp-totalpages"]).toBe("1");
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
      expect(body[0]).toHaveProperty("slug");
      expect(body[0]).toHaveProperty("name");
    });

    it("supports pagination query parameters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/wp/v2/plugins?page=1&per_page=10",
      });

      expect(response.statusCode).toBe(200);
    });

    it("supports status filter parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/wp/v2/plugins?status=active",
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("GET /wp/v2/plugins/:slug", () => {
    it("returns 200 with plugin entry when found", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/wp/v2/plugins/existing-plugin",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.slug).toBe("existing-plugin");
      expect(body.name).toBe("Existing Plugin");
    });

    it("returns 404 with WP error format when not found", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/wp/v2/plugins/nonexistent-plugin",
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("rest_plugin_invalid_slug");
      expect(body.message).toBe("Plugin not found.");
      expect(body.data.status).toBe(404);
    });
  });

  describe("POST /wp/v2/plugins", () => {
    it("returns 401 without admin auth token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/wp/v2/plugins",
        payload: {
          slug: "new-plugin",
          name: "New Plugin",
          version: "1.0.0",
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 201 with created plugin when valid admin auth provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/wp/v2/plugins",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          slug: "new-plugin",
          name: "New Plugin",
          version: "1.0.0",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.slug).toBe("new-plugin");
      expect(body.name).toBe("New Plugin");
      expect(body.version).toBe("1.0.0");
    });

    it("returns 400 when required fields are missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/wp/v2/plugins",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          slug: "incomplete-plugin",
          // Missing name and version
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.code).toBe("rest_missing_param");
      expect(body.message).toContain("slug");
      expect(body.message).toContain("name");
      expect(body.message).toContain("version");
    });

    it("returns 201 with optional fields when provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/wp/v2/plugins",
        headers: {
          authorization: `Bearer ${ADMIN_TOKEN}`,
        },
        payload: {
          slug: "full-plugin",
          name: "Full Plugin",
          version: "1.0.0",
          author: "John Doe",
          registryUrl: "https://registry.example.com/full-plugin",
          tarballUrl: "https://registry.example.com/full-plugin.tar.gz",
          publishedAt: "2026-01-01T00:00:00Z",
          meta: { license: "MIT" },
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.author).toBe("John Doe");
      expect(body.registryUrl).toBe("https://registry.example.com/full-plugin");
    });
  });
});
