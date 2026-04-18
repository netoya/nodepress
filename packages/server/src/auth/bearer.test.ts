import { describe, it, expect, afterEach, vi } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth, requireAdmin } from "./bearer.js";

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
    return { role: req.user?.role };
  });

  await app.ready();
  return app;
}

describe("bearer auth middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes with a valid token (dev default)", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer dev-admin-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { role: string };
    expect(body.role).toBe("admin");
  });

  it("returns 401 with an invalid token", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer wrong-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when Authorization header is absent", async () => {
    const app = await buildApp();

    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(401);
  });
});
