import { describe, it, expect, beforeEach, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { registerBearerAuth } from "../../../auth/index.js";
import { registerHooks } from "../../../hooks.js";
import publicPlugin from "../index.js";

// Mock @nodepress/db with in-memory store
const mockPostsStore = [
  {
    id: 1,
    title: "Welcome to NodePress",
    slug: "welcome-to-nodepress",
    content: "This is the welcome post content.",
    excerpt: "Welcome excerpt",
    status: "publish",
    authorId: 1,
    type: "post",
    parentId: null,
    menuOrder: 0,
    meta: {},
    createdAt: new Date("2026-04-18T10:00:00Z"),
    updatedAt: new Date("2026-04-18T10:00:00Z"),
  },
  {
    id: 2,
    title: "Draft Post",
    slug: "draft-post",
    content: "This is a draft post that should not appear.",
    excerpt: "",
    status: "draft",
    authorId: 1,
    type: "post",
    parentId: null,
    menuOrder: 0,
    meta: {},
    createdAt: new Date("2026-04-18T11:00:00Z"),
    updatedAt: new Date("2026-04-18T11:00:00Z"),
  },
];

vi.mock("@nodepress/db", () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve(mockPostsStore)),
        })),
      })),
    },
    posts: {},
    eq: vi.fn(),
  };
});

describe("Public HTML Routes", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });
    await registerBearerAuth(app);
    await registerHooks(app);
    await app.register(publicPlugin);
  });

  it("GET / returns 200 with text/html and contains NodePress", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.body).toContain("NodePress");
    expect(response.body).toContain("<article>");
  });

  it("GET / lists published posts only", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("Welcome to NodePress");
    expect(response.body).not.toContain("Draft Post");
  });

  it("GET /p/:slug returns 200 with published post content and the_content hook applied", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/p/welcome-to-nodepress",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.body).toContain("Welcome to NodePress");
    expect(response.body).toContain("This is the welcome post content.");
    expect(response.body).toContain('<div class="content">');
  });

  it("GET /p/:slug with custom filter hook — hook mutation visible in page", async () => {
    // Register a custom filter that appends text to content
    app.hooks.addFilter("the_content", {
      type: "filter" as const,
      pluginId: "test-plugin",
      priority: 10,
      fn: (content: string) => content + "\n<!-- Hook Footer Injected -->",
    });

    const response = await app.inject({
      method: "GET",
      url: "/p/welcome-to-nodepress",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("<!-- Hook Footer Injected -->");
  });

  it("GET /p/nonexistent-slug returns 404 HTML", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/p/nonexistent-slug",
    });

    expect(response.statusCode).toBe(404);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.body).toContain("404");
    expect(response.body).toContain("Post not found");
  });

  it("GET /p/draft-post returns 404 (no draft leak)", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/p/draft-post",
    });

    expect(response.statusCode).toBe(404);
    expect(response.body).not.toContain("This is a draft post");
  });
});
