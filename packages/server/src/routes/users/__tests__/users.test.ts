import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth } from "../../../auth/index.js";
import usersPlugin from "../index.js";

/**
 * Shared user fixtures.
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

const editorUserRow = {
  id: 2,
  login: "editor",
  email: "editor@nodepress.local",
  displayName: "Editor",
  passwordHash: "dev-only-placeholder",
  roles: ["editor"],
  capabilities: {},
  meta: {},
  createdAt: new Date("2024-01-02"),
  updatedAt: new Date("2024-01-02"),
};

const authorUserRow = {
  id: 3,
  login: "author",
  email: "author@nodepress.local",
  displayName: "Author",
  passwordHash: "dev-only-placeholder",
  roles: ["author"],
  capabilities: {},
  meta: {},
  createdAt: new Date("2024-01-03"),
  updatedAt: new Date("2024-01-03"),
};

// ---------------------------------------------------------------------------
// Mock @nodepress/db — mutable slot lets tests swap the resolved users.
// ---------------------------------------------------------------------------

let mockAllUserRows: object[] = [adminUserRow, editorUserRow, authorUserRow];

vi.mock("@nodepress/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nodepress/db")>();
  return {
    ...actual,
    db: {
      select: () => {
        const fromChain = {
          where: () => ({
            limit: () => Promise.resolve([mockAllUserRows[0]]),
          }),
          // For listUsers (no where clause) — support limit/offset
          limit: (l: number) => ({
            offset: (o: number) =>
              Promise.resolve(mockAllUserRows.slice(o, o + l)),
          }),
          // For total count — make it thenable
          then: (onFulfilled: (value: object[]) => void) => {
            return Promise.resolve(mockAllUserRows).then(onFulfilled);
          },
        };
        return {
          from: () => fromChain,
        };
      },
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
    mockAllUserRows = [adminUserRow, editorUserRow, authorUserRow];

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

// ---------------------------------------------------------------------------
// GET /wp/v2/users
// ---------------------------------------------------------------------------

describe("GET /wp/v2/users", () => {
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

  it("returns 200 with array of users (public listing, no auth required)", async () => {
    mockAllUserRows = [adminUserRow, editorUserRow, authorUserRow];

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users",
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as Record<string, unknown>[];

    // Should return array of 3 users
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(3);

    // Check first user shape (public — no email)
    const firstUser = body[0] as Record<string, unknown>;
    expect(firstUser["id"]).toBe(1);
    expect(firstUser["name"]).toBe("Admin");
    expect(firstUser["slug"]).toBe("admin");
    expect(firstUser["email"]).toBeUndefined();
    expect(typeof firstUser["avatar_urls"]).toBe("object");
  });

  it("returns X-WP-Total and X-WP-TotalPages headers", async () => {
    mockAllUserRows = [adminUserRow, editorUserRow, authorUserRow];

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users?page=1&per_page=10",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-wp-total"]).toBe("3");
    expect(response.headers["x-wp-totalpages"]).toBe("1");
  });

  it("supports pagination with page and per_page parameters", async () => {
    mockAllUserRows = [adminUserRow, editorUserRow, authorUserRow];

    // First page, 2 per page
    const response1 = await app.inject({
      method: "GET",
      url: "/wp/v2/users?page=1&per_page=2",
    });

    expect(response1.statusCode).toBe(200);
    const body1 = JSON.parse(response1.body) as Record<string, unknown>[];
    expect(body1.length).toBe(2);
    const user1a = body1[0] as Record<string, unknown>;
    const user1b = body1[1] as Record<string, unknown>;
    expect(user1a["id"]).toBe(1);
    expect(user1b["id"]).toBe(2);

    // Second page
    const response2 = await app.inject({
      method: "GET",
      url: "/wp/v2/users?page=2&per_page=2",
    });

    expect(response2.statusCode).toBe(200);
    const body2 = JSON.parse(response2.body) as Record<string, unknown>[];
    expect(body2.length).toBe(1);
    const user2 = body2[0] as Record<string, unknown>;
    expect(user2["id"]).toBe(3);
  });

  it("omits email field from public listing response", async () => {
    mockAllUserRows = [adminUserRow];

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/users",
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as Record<string, unknown>[];
    const user = body[0] as Record<string, unknown>;

    // Email field should not be present in public listing
    expect(user["email"]).toBeUndefined();

    // But public fields should be present
    expect(user["id"]).toBe(1);
    expect(user["name"]).toBe("Admin");
    expect(user["slug"]).toBe("admin");
  });
});
