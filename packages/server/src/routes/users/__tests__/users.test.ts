import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth } from "../../../auth/index.js";
import usersPlugin from "../index.js";

/**
 * Shared admin user fixture — matches the seeded admin user structure.
 */
const adminUserRow = {
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
};

// ---------------------------------------------------------------------------
// Mock @nodepress/db — mutable slot lets tests swap the resolved user.
// ---------------------------------------------------------------------------

let mockUserRows: object[] = [adminUserRow];

vi.mock("@nodepress/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nodepress/db")>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve(mockUserRows),
          }),
        }),
      }),
    },
  };
});

// ---------------------------------------------------------------------------
// GET /wp/v2/users/me
// ---------------------------------------------------------------------------

describe("GET /wp/v2/users/me", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;

  beforeAll(async () => {
    process.env["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test";

    app = Fastify({ logger: false });
    await registerBearerAuth(app);
    await app.register(usersPlugin);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 401 without a Bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users/me",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 with an invalid Bearer token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users/me",
      headers: { authorization: "Bearer bad-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 200 with valid Bearer token and WP user shape", async () => {
    mockUserRows = [adminUserRow];

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users/me",
      headers: { authorization: "Bearer dev-admin-token" },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as Record<string, unknown>;

    // WP-compatible fields
    expect(body["id"]).toBe(1);
    expect(body["name"]).toBe("Admin");
    expect(body["slug"]).toBe("admin");
    expect(body["email"]).toBe("admin@nodepress.local");
    expect(Array.isArray(body["roles"])).toBe(true);
    expect((body["roles"] as string[]).includes("administrator")).toBe(true);
    expect(typeof body["capabilities"]).toBe("object");

    // _nodepress namespace
    const np = body["_nodepress"] as Record<string, unknown>;
    expect(np).toBeDefined();
    expect(np["login"]).toBe("admin");
  });
});
