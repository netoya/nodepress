/**
 * Real-DB integration tests for the Posts REST API.
 *
 * Uses @testcontainers/postgresql to spin up an ephemeral Postgres instance.
 * Applies the full schema migration before the suite and truncates between tests.
 *
 * These tests complement the 14 mocked tests in posts.integration.test.ts:
 *   - Mocked tests: routing + auth enforcement (no DB needed)
 *   - Real-DB tests: Drizzle queries, WP shape, edge cases against real data
 *
 * Run via:  npm run test:integration
 * Requires Docker. Automatically skipped when DOCKER_AVAILABLE=false.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { posts, users, terms, termRelationships } from "@nodepress/db";
import { eq } from "drizzle-orm";

const DOCKER_AVAILABLE = process.env["DOCKER_AVAILABLE"] !== "false";
const ADMIN_TOKEN = process.env["NODEPRESS_ADMIN_TOKEN"] ?? "dev-admin-token";

const describeReal = DOCKER_AVAILABLE ? describe : describe.skip;

describeReal(
  "Posts API — real Postgres integration",
  () => {
    let app: any;

    beforeAll(async () => {
      // 1. Start testcontainer and apply migrations.
      //    setupTestDb sets process.env.DATABASE_URL before any db module loads.
      const { setupTestDb } = await import("../../../__tests__/helpers/db.js");
      await setupTestDb();

      // 2. Swap @nodepress/db so route handlers use the test-container pool.
      //    vi.doMock must be called before the handler modules are imported.
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      vi.doMock("@nodepress/db", async () => {
        const real =
          await vi.importActual<typeof import("@nodepress/db")>(
            "@nodepress/db",
          );
        return { ...real, db: getTestDb(), pool: null };
      });

      // 3. Flush module cache so every subsequent import picks up the mock.
      vi.resetModules();
      // Re-register mock post-resetModules (resetModules clears vi.doMock state).
      vi.doMock("@nodepress/db", async () => {
        const real =
          await vi.importActual<typeof import("@nodepress/db")>(
            "@nodepress/db",
          );
        return { ...real, db: getTestDb(), pool: null };
      });

      // 4. Build the Fastify app using dynamically imported (mocked) modules.
      const Fastify = (await import("fastify")).default;
      const { registerBearerAuth } = await import("../../../auth/index.js");
      const { registerHooks } = await import("../../../hooks.js");
      const postsPlugin = await import("../index.js");

      app = Fastify();
      await registerBearerAuth(app);
      await registerHooks(app);
      await app.register(postsPlugin.default);
      await app.ready();

      // 5. Seed admin user — authorId=1 is hardcoded in createPost handler.
      const testDb = getTestDb();
      await testDb.insert(users).values({
        id: 1,
        login: "admin",
        email: "admin@test.local",
        displayName: "Admin",
        passwordHash: "hashed",
        roles: ["administrator"],
      });
    }, 90_000); // cold docker pull can take ~60s

    afterEach(async () => {
      const { truncateAll, getTestDb } =
        await import("../../../__tests__/helpers/db.js");
      await truncateAll();
      // Re-seed admin after full truncate (truncateAll uses CASCADE).
      const testDb = getTestDb();
      await testDb.insert(users).values({
        id: 1,
        login: "admin",
        email: "admin@test.local",
        displayName: "Admin",
        passwordHash: "hashed",
        roles: ["administrator"],
      });
    });

    afterAll(async () => {
      await app?.close();
      const { teardownTestDb } =
        await import("../../../__tests__/helpers/db.js");
      await teardownTestDb();
      vi.restoreAllMocks();
    });

    // ─── GET /wp/v2/posts ─────────────────────────────────────────────────────

    describe("GET /wp/v2/posts", () => {
      it("returns empty list and pagination headers when no posts exist", async () => {
        const res = await app.inject({ method: "GET", url: "/wp/v2/posts" });
        expect(res.statusCode).toBe(200);
        expect(res.headers["x-wp-total"]).toBe("0");
        expect(res.headers["x-wp-totalpages"]).toBe("0");
        expect(JSON.parse(res.body)).toEqual([]);
      });

      it("returns seeded published post with correct WP shape (DIV-002, DIV-005)", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        await testDb.insert(posts).values({
          title: "Hello World",
          slug: "hello-world",
          content: "Body text",
          status: "publish",
          authorId: 1,
        });

        const res = await app.inject({
          method: "GET",
          url: "/wp/v2/posts?status=publish",
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body) as Array<Record<string, unknown>>;
        expect(body).toHaveLength(1);

        const post = body[0]!;
        // DIV-002: rendered objects, not plain strings
        expect(post["title"]).toMatchObject({
          rendered: "Hello World",
          protected: false,
        });
        expect(post["content"]).toMatchObject({
          rendered: "Body text",
          protected: false,
        });
        expect(post["excerpt"]).toMatchObject({
          rendered: "",
          protected: false,
        });
        // DIV-005: _nodepress namespace present
        expect(post["_nodepress"]).toBeDefined();
        expect(res.headers["x-wp-total"]).toBe("1");
      });
    });

    // ─── GET /wp/v2/posts/:id ─────────────────────────────────────────────────

    describe("GET /wp/v2/posts/:id", () => {
      it("returns 404 for non-existent post (real DB)", async () => {
        const res = await app.inject({
          method: "GET",
          url: "/wp/v2/posts/99999",
        });
        expect(res.statusCode).toBe(404);
        expect(JSON.parse(res.body)).toMatchObject({ code: "NOT_FOUND" });
      });

      it("returns post with DIV-001 (no date_gmt) and DIV-005 (_nodepress)", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        const [created] = await testDb
          .insert(posts)
          .values({
            title: "Single Post",
            slug: "single-post",
            content: "Content here",
            status: "publish",
            authorId: 1,
          })
          .returning();

        const res = await app.inject({
          method: "GET",
          url: `/wp/v2/posts/${created!.id}`,
        });
        expect(res.statusCode).toBe(200);
        const post = JSON.parse(res.body) as Record<string, unknown>;

        expect(post["id"]).toBe(created!.id);
        expect(post["slug"]).toBe("single-post");
        // DIV-001: date/modified present, *_gmt variants absent
        expect(post["date"]).toBeTruthy();
        expect(post["modified"]).toBeTruthy();
        expect(post["date_gmt"]).toBeUndefined();
        expect(post["modified_gmt"]).toBeUndefined();
        // DIV-005
        const np = post["_nodepress"] as Record<string, unknown>;
        expect(np["type"]).toBe("post");
        expect(np["parent_id"]).toBeNull();
      });
    });

    // ─── POST /wp/v2/posts ────────────────────────────────────────────────────

    describe("POST /wp/v2/posts", () => {
      it("creates post in DB and returns 201 with WP shape", async () => {
        const res = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            title: "New Post",
            content: "Rich content",
            status: "publish",
          },
        });
        expect(res.statusCode).toBe(201);
        const post = JSON.parse(res.body) as Record<string, unknown>;
        expect(post["id"]).toBeTypeOf("number");
        expect(post["slug"]).toBe("new-post");

        // Verify the row actually landed in the DB
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        const [row] = await testDb
          .select()
          .from(posts)
          .where(eq(posts.id, post["id"] as number));
        expect(row?.["title"]).toBe("New Post");
        expect(row?.["status"]).toBe("publish");
      });

      it("returns 400 on duplicate slug", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        await testDb.insert(posts).values({
          title: "Existing",
          slug: "dup-slug",
          content: "",
          status: "publish",
          authorId: 1,
        });

        const res = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: { title: "Other", content: "", slug: "dup-slug" },
        });
        expect(res.statusCode).toBe(400);
        expect(JSON.parse(res.body)).toMatchObject({ code: "INVALID_REQUEST" });
      });
    });

    // ─── PUT /wp/v2/posts/:id ─────────────────────────────────────────────────

    describe("PUT /wp/v2/posts/:id", () => {
      it("updates title and persists change to DB", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        const [created] = await testDb
          .insert(posts)
          .values({
            title: "Original",
            slug: "original-slug",
            content: "",
            status: "draft",
            authorId: 1,
          })
          .returning();

        const res = await app.inject({
          method: "PUT",
          url: `/wp/v2/posts/${created!.id}`,
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: { title: "Updated Title" },
        });
        expect(res.statusCode).toBe(200);
        const post = JSON.parse(res.body) as Record<string, unknown>;
        expect((post["title"] as Record<string, unknown>)["rendered"]).toBe(
          "Updated Title",
        );

        const [row] = await testDb
          .select()
          .from(posts)
          .where(eq(posts.id, created!.id));
        expect(row?.["title"]).toBe("Updated Title");
      });
    });

    // ─── DELETE /wp/v2/posts/:id ──────────────────────────────────────────────

    describe("DELETE /wp/v2/posts/:id", () => {
      it("soft-deletes post (status=trash) by default", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        const [created] = await testDb
          .insert(posts)
          .values({
            title: "To Trash",
            slug: "to-trash",
            content: "",
            status: "publish",
            authorId: 1,
          })
          .returning();

        const res = await app.inject({
          method: "DELETE",
          url: `/wp/v2/posts/${created!.id}`,
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body) as Record<string, unknown>;
        expect(body["status"]).toBe("trash");

        const [row] = await testDb
          .select()
          .from(posts)
          .where(eq(posts.id, created!.id));
        expect(row?.["status"]).toBe("trash");
      });

      it("hard-deletes post when force=true", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();
        const [created] = await testDb
          .insert(posts)
          .values({
            title: "To Delete",
            slug: "to-delete",
            content: "",
            status: "publish",
            authorId: 1,
          })
          .returning();

        const res = await app.inject({
          method: "DELETE",
          url: `/wp/v2/posts/${created!.id}?force=true`,
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        });
        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body) as Record<string, unknown>;
        expect(body["deleted"]).toBe(true);

        const rows = await testDb
          .select()
          .from(posts)
          .where(eq(posts.id, created!.id));
        expect(rows).toHaveLength(0);
      });
    });

    describe("Categories and tags", () => {
      it("POST with categories array persists term_relationships", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();

        // Create test categories
        const cat1 = await testDb
          .insert(terms)
          .values({
            taxonomy: "category",
            name: "Tech",
            slug: "tech",
          })
          .returning();

        const cat2 = await testDb
          .insert(terms)
          .values({
            taxonomy: "category",
            name: "News",
            slug: "news",
          })
          .returning();

        // POST with categories
        const res = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            title: "Test Post with Categories",
            content: "Content",
            categories: [cat1[0]!.id, cat2[0]!.id],
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body) as Record<string, unknown>;

        // Response should include categories array
        expect(body["categories"]).toEqual(
          expect.arrayContaining([cat1[0]!.id, cat2[0]!.id]),
        );

        // Verify DB has relationships
        const rels = await testDb
          .select()
          .from(termRelationships)
          .where(eq(termRelationships.postId, body["id"] as number));
        expect(rels).toHaveLength(2);
      });

      it("PUT replaces categories without accumulating", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();

        // Create categories
        const cat1 = await testDb
          .insert(terms)
          .values({
            taxonomy: "category",
            name: "Old",
            slug: "old",
          })
          .returning();

        const cat2 = await testDb
          .insert(terms)
          .values({
            taxonomy: "category",
            name: "New",
            slug: "new",
          })
          .returning();

        // Create post with cat1
        const createRes = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            title: "Post to Update",
            content: "Content",
            categories: [cat1[0]!.id],
          },
        });

        const postId = (JSON.parse(createRes.body) as Record<string, unknown>)[
          "id"
        ] as number;

        // Verify 1 relationship
        let rels = await testDb
          .select()
          .from(termRelationships)
          .where(eq(termRelationships.postId, postId));
        expect(rels).toHaveLength(1);
        expect(rels[0]!.termId).toBe(cat1[0]!.id);

        // PUT with different category
        const updateRes = await app.inject({
          method: "PUT",
          url: `/wp/v2/posts/${postId}`,
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            categories: [cat2[0]!.id],
          },
        });

        expect(updateRes.statusCode).toBe(200);
        const updateBody = JSON.parse(updateRes.body) as Record<
          string,
          unknown
        >;
        expect(updateBody["categories"]).toEqual([cat2[0]!.id]);

        // Verify only cat2, not both
        rels = await testDb
          .select()
          .from(termRelationships)
          .where(eq(termRelationships.postId, postId));
        expect(rels).toHaveLength(1);
        expect(rels[0]!.termId).toBe(cat2[0]!.id);
      });

      it("GET post returns empty categories array when no relationships", async () => {
        const res = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            title: "Post No Categories",
            content: "Content",
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body) as Record<string, unknown>;

        expect(body["categories"]).toEqual([]);
        expect(body["tags"]).toEqual([]);
      });

      it("POST with tags array persists and separates from categories", async () => {
        const { getTestDb } = await import("../../../__tests__/helpers/db.js");
        const testDb = getTestDb();

        // Create a tag
        const tag = await testDb
          .insert(terms)
          .values({
            taxonomy: "post_tag",
            name: "Important",
            slug: "important",
          })
          .returning();

        // Create a category
        const cat = await testDb
          .insert(terms)
          .values({
            taxonomy: "category",
            name: "Urgent",
            slug: "urgent",
          })
          .returning();

        // POST with both
        const res = await app.inject({
          method: "POST",
          url: "/wp/v2/posts",
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          payload: {
            title: "Post with Categories and Tags",
            content: "Content",
            categories: [cat[0]!.id],
            tags: [tag[0]!.id],
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.body) as Record<string, unknown>;

        // Both should be present, separated
        expect(body["categories"]).toEqual([cat[0]!.id]);
        expect(body["tags"]).toEqual([tag[0]!.id]);

        // Verify DB has 2 separate relationships
        const rels = await testDb
          .select()
          .from(termRelationships)
          .where(eq(termRelationships.postId, body["id"] as number));
        expect(rels).toHaveLength(2);
      });
    });
  },
  { timeout: 120_000 },
);
