import { describe, it, expect, afterEach, vi } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth, requireAdmin } from "./bearer.js";

// ---------------------------------------------------------------------------
// Mock @nodepress/db so tests do not require a real database connection.
// The mock returns an admin user by default. The 403 test overrides it with
// a per-test mock via a separate describe block.
// ---------------------------------------------------------------------------

/** Mutable slot so individual tests can swap the resolved user. */
let mockUserRows: object[] = [];

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

const adminRow = {
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

const editorRow = {
  ...adminRow,
  id: 2,
  login: "editor",
  email: "editor@nodepress.local",
  displayName: "Editor",
  roles: ["editor"],
};

// Helper: build a minimal Fastify app with bearer auth registered
async function buildApp(token?: string) {
  if (token !== undefined) {
    vi.stubEnv("NODEPRESS_ADMIN_TOKEN", token);
  } else {
    // Ensure env var is not set so the dev default is used
    vi.unstubAllEnvs();
  }

  const app = Fastify({ logger: false });
  await registerBearerAuth(app);

  app.get("/protected", { preHandler: [requireAdmin] }, async (req) => {
    return { id: req.user?.id, roles: req.user?.roles };
  });

  await app.ready();
  return app;
}

describe("bearer auth middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mockUserRows = [adminRow]; // reset to default after each test
  });

  it("passes with a valid token (dev default) and returns user from DB", async () => {
    mockUserRows = [adminRow];
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer dev-admin-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { id: number; roles: string[] };
    expect(body.id).toBe(1);
    expect(body.roles).toContain("administrator");
  });

  it("returns 401 with an invalid token", async () => {
    mockUserRows = [adminRow];
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer wrong-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when Authorization header is absent", async () => {
    mockUserRows = [adminRow];
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 403 when user exists but lacks administrator role", async () => {
    mockUserRows = [editorRow];
    vi.stubEnv("NODEPRESS_ADMIN_USER", "editor");
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer dev-admin-token" },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as { code: string };
    expect(body.code).toBe("FORBIDDEN");
  });
});
