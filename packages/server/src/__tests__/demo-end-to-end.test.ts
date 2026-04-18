/**
 * Demo end-to-end integration test — Sprint 1 day 2.
 *
 * Simulates the exact demo flow for 2026-04-30:
 *   hook registered programmatically → mutates payload → POST /wp/v2/posts
 *   → response reflects mutation → GET /wp/v2/posts/:id → same filter applied.
 *
 * The DB layer is mocked via vi.mock so no real Postgres is needed.
 * The HookRegistry is a real instance (not a mock) — the point is to prove
 * the wiring, not to test the registry itself.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import { registerBearerAuth } from "../auth/index.js";
import { registerHooks } from "../hooks.js";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry, DEFAULT_HOOK_PRIORITY } from "@nodepress/core";
import type { FilterEntry } from "@nodepress/core";

// ---------------------------------------------------------------------------
// Mock DB — intercept @nodepress/db to avoid real Postgres
// ---------------------------------------------------------------------------

/** Shared in-memory store for the mock database */
const mockStore: Record<number, MockPost> = {};
let nextId = 1;

interface MockPost {
  id: number;
  title: string;
  content: string;
  status: string;
  excerpt: string;
  slug: string;
  authorId: number;
  type: string;
  parentId: number | null;
  menuOrder: number;
  meta: null;
  createdAt: Date;
  updatedAt: Date;
}

vi.mock("@nodepress/db", () => {
  const mockEq = vi.fn((_col: unknown, _val: unknown) => ({ type: "eq" }));

  const mockDb = {
    insert: vi.fn((_table: unknown) => ({
      values: vi.fn((data: Record<string, unknown>) => ({
        returning: vi.fn(() => {
          const now = new Date();
          const post: MockPost = {
            id: nextId++,
            title: String(data["title"] ?? ""),
            content: String(data["content"] ?? ""),
            status: String(data["status"] ?? "draft"),
            excerpt: String(data["excerpt"] ?? ""),
            slug: String(data["slug"] ?? ""),
            authorId: Number(data["authorId"] ?? 1),
            type: "post",
            parentId: null,
            menuOrder: 0,
            meta: null,
            createdAt: now,
            updatedAt: now,
          };
          mockStore[post.id] = post;
          return Promise.resolve([post]);
        }),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn((_table: unknown) => ({
        where: vi.fn((_cond: unknown) => {
          // Return all posts for simplicity (tests use specific IDs)
          return Promise.resolve(Object.values(mockStore));
        }),
      })),
    })),
  };

  return {
    db: mockDb,
    posts: { id: "id", title: "title", content: "content" },
    eq: mockEq,
    and: vi.fn((...args: unknown[]) => args),
    or: vi.fn((...args: unknown[]) => args),
    ilike: vi.fn((_col: unknown, _val: unknown) => ({ type: "ilike" })),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_TOKEN = "dev-admin-token";

/**
 * Build a minimal Fastify app with auth + a fresh isolated HookRegistry.
 * Each call gets its own registry so test suites don't bleed filter registrations.
 * Returns both the app and its registry so tests can add filters before requests.
 */
async function buildDemoApp(): Promise<{
  app: Awaited<ReturnType<typeof Fastify>>;
  registry: HookRegistry;
}> {
  // Reset the store between test suites
  for (const k of Object.keys(mockStore)) {
    delete mockStore[Number(k)];
  }
  nextId = 1;

  const registry = createHookRegistry();
  const app = Fastify({ logger: false });
  await registerBearerAuth(app);
  await registerHooks(app, registry);

  // Register routes inline (avoids DB coupling in index.ts plugin)
  await app.register(async (fastify) => {
    const { listPosts, getPost, createPost } =
      await import("../routes/posts/handlers.js");

    fastify.get("/wp/v2/posts", listPosts);
    fastify.get("/wp/v2/posts/:id", getPost);
    fastify.post(
      "/wp/v2/posts",
      { preHandler: [fastify.requireAdmin] },
      createPost,
    );
  });

  await app.ready();
  return { app, registry };
}

// ---------------------------------------------------------------------------
// Scenario 1 — happy path: filters mutate title and content
// ---------------------------------------------------------------------------

describe("Demo flow — hook mutations visible in POST + GET responses", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;
  let registry: HookRegistry;

  beforeAll(async () => {
    ({ app, registry } = await buildDemoApp());

    // Register pre_save_post filter: prepend [DEMO] to the title
    const preSaveEntry: FilterEntry<{ title: string }> = {
      pluginId: "demo-plugin",
      priority: DEFAULT_HOOK_PRIORITY,
      fn: (postData) => ({
        ...(postData as object),
        title: `[DEMO] ${(postData as { title: string }).title}`,
      }),
    };
    registry.addFilter("pre_save_post", preSaveEntry as FilterEntry);

    // Register the_content filter: append NodePress footer
    const theContentEntry: FilterEntry<string> = {
      pluginId: "demo-plugin",
      priority: DEFAULT_HOOK_PRIORITY,
      fn: (content) =>
        `${content as string}<footer>Powered by NodePress</footer>`,
    };
    registry.addFilter("the_content", theContentEntry as FilterEntry);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /wp/v2/posts returns 201 with mutated title (pre_save_post applied)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Hello", content: "World" },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as Record<string, unknown>;
    const title = body["title"] as { rendered: string };
    expect(title.rendered).toContain("[DEMO]");
    expect(title.rendered).toContain("Hello");
  });

  it("POST response content.rendered contains NodePress footer (the_content applied)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Hello2", content: "World2" },
    });
    const body = res.json() as Record<string, unknown>;
    const content = body["content"] as { rendered: string };
    expect(content.rendered).toContain("World2");
    expect(content.rendered).toContain("<footer>Powered by NodePress</footer>");
  });

  it("GET /wp/v2/posts/:id also applies the_content filter when serializing", async () => {
    // Create a post first
    const createRes = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "GetTest", content: "GetContent" },
    });
    expect(createRes.statusCode).toBe(201);
    const created = createRes.json() as { id: number };

    // Mock DB select to return the created post from the store
    const { db } = await import("@nodepress/db");
    const mockSelect = db.select as ReturnType<typeof vi.fn>;
    mockSelect.mockImplementationOnce(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => {
          const post = mockStore[created.id];
          return Promise.resolve(post ? [post] : []);
        }),
      })),
    }));

    const getRes = await app.inject({
      method: "GET",
      url: `/wp/v2/posts/${created.id}`,
    });
    expect(getRes.statusCode).toBe(200);
    const getBody = getRes.json() as Record<string, unknown>;
    const content = getBody["content"] as { rendered: string };
    expect(content.rendered).toContain("<footer>Powered by NodePress</footer>");
    expect(content.rendered).toContain("GetContent");
  });

  it("pre_save_post filter mutates title stored in DB (visible in created post)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Original", content: "Body" },
    });
    const body = res.json() as Record<string, unknown>;
    const title = body["title"] as { rendered: string; protected: boolean };
    // Title was mutated by filter — must start with [DEMO]
    expect(title.rendered.startsWith("[DEMO]")).toBe(true);
    expect(title.protected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — resilience: a throwing filter must not abort the request
// ---------------------------------------------------------------------------

describe("Demo flow — circuit breaker: throwing filter does not abort POST", () => {
  let app: Awaited<ReturnType<typeof Fastify>>;
  let registry: HookRegistry;

  beforeAll(async () => {
    ({ app, registry } = await buildDemoApp());

    // Register a filter that always throws
    const bustedEntry: FilterEntry = {
      pluginId: "busted-plugin",
      priority: DEFAULT_HOOK_PRIORITY,
      fn: () => {
        throw new Error("Simulated plugin crash");
      },
    };
    registry.addFilter("pre_save_post", bustedEntry);

    // Register a the_content filter that also throws
    const bustedContent: FilterEntry<string> = {
      pluginId: "busted-plugin",
      priority: DEFAULT_HOOK_PRIORITY,
      fn: () => {
        throw new Error("Content filter crash");
      },
    };
    registry.addFilter("the_content", bustedContent as FilterEntry);
  });

  afterAll(async () => {
    await app.close();
  });

  it("POST /wp/v2/posts returns 201 even when pre_save_post filter throws", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Resilient", content: "Survivor" },
    });
    // Circuit breaker contains the throw — post is still created
    expect(res.statusCode).toBe(201);
  });

  it("content.rendered equals raw DB value when the_content filter throws (no mutation)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Crash", content: "OriginalContent" },
    });
    const body = res.json() as Record<string, unknown>;
    const content = body["content"] as { rendered: string };
    // Filter threw — content must be unmutated original
    expect(content.rendered).toBe("OriginalContent");
  });

  it("title.rendered equals raw DB value when pre_save_post filter throws (no mutation)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "NoMutation", content: "Body" },
    });
    const body = res.json() as Record<string, unknown>;
    const title = body["title"] as { rendered: string };
    // No [DEMO] prefix — filter threw before mutation
    expect(title.rendered).toBe("NoMutation");
  });

  it("response shape is still valid WP post shape after filter crash", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wp/v2/posts",
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      payload: { title: "Shape", content: "Check" },
    });
    const body = res.json() as Record<string, unknown>;
    expect(typeof body["id"]).toBe("number");
    expect(typeof body["slug"]).toBe("string");
    expect(typeof body["status"]).toBe("string");
    expect(body["title"]).toMatchObject({ rendered: expect.any(String) });
  });
});
