/**
 * Real-DB integration tests for the Pages REST API (M3).
 *
 * WP-conformance test suite verifying that /wp/v2/pages behaves correctly and
 * does NOT mix posts into page listings (type filtering).
 *
 * Uses @testcontainers/postgresql. Automatically skipped when DOCKER_AVAILABLE=false.
 * Run via:  npm run test:integration
 *
 * 8 cases (minimum per spec):
 *  1. Create page with valid parent
 *  2. Update menu_order
 *  3. Slug collision behavior (page and post share same slug — same table, unique constraint)
 *  4. context=edit returns raw fields
 *  5. GET /wp/v2/pages does NOT include posts (type isolation)
 *  6. GET /wp/v2/pages/:id returns 404 for non-existent page
 *  7. Page with non-existent parent — FK is nullable, accepted
 *  8. status=draft and status=publish both work correctly
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
import { users, posts } from "@nodepress/db";
import { eq } from "drizzle-orm";

const DOCKER_AVAILABLE = process.env["DOCKER_AVAILABLE"] !== "false";
const ADMIN_TOKEN = process.env["NODEPRESS_ADMIN_TOKEN"] ?? "dev-admin-token";

const describeReal = DOCKER_AVAILABLE ? describe : describe.skip;

describeReal(
  "Pages API — real Postgres integration (WP-conformance)",
  () => {
    let app: any;

    beforeAll(async () => {
      const { setupTestDb } = await import("../../../__tests__/helpers/db.js");
      await setupTestDb();

      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      vi.doMock("@nodepress/db", async () => {
        const real =
          await vi.importActual<typeof import("@nodepress/db")>(
            "@nodepress/db",
          );
        return { ...real, db: getTestDb(), pool: null };
      });

      vi.resetModules();
      vi.doMock("@nodepress/db", async () => {
        const real =
          await vi.importActual<typeof import("@nodepress/db")>(
            "@nodepress/db",
          );
        return { ...real, db: getTestDb(), pool: null };
      });

      const Fastify = (await import("fastify")).default;
      const { registerBearerAuth } = await import("../../../auth/index.js");
      const { registerHooks } = await import("../../../hooks.js");
      const pagesPlugin = await import("../index.js");

      app = Fastify();
      await registerBearerAuth(app);
      await registerHooks(app);
      await app.register(pagesPlugin.default);
      await app.ready();

      const testDb = getTestDb();
      await testDb.insert(users).values({
        id: 1,
        login: "admin",
        email: "admin@test.local",
        displayName: "Admin",
        passwordHash: "hashed",
        roles: ["administrator"],
      });
    }, 90_000);

    afterEach(async () => {
      const { truncateAll, getTestDb } =
        await import("../../../__tests__/helpers/db.js");
      await truncateAll();
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

    // ─── Case 1: Create page with valid parent ────────────────────────────────

    it("creates page with valid parent and returns parent at response root", async () => {
      // Create parent page first
      const parentRes = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Parent Page",
          content: "Parent content",
          status: "publish",
        },
      });
      expect(parentRes.statusCode).toBe(201);
      const parentBody = JSON.parse(parentRes.body) as Record<string, unknown>;
      const parentId = parentBody["id"] as number;

      // Create child page
      const childRes = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Child Page",
          content: "Child content",
          status: "publish",
          parent: parentId,
        },
      });
      expect(childRes.statusCode).toBe(201);
      const childBody = JSON.parse(childRes.body) as Record<string, unknown>;

      // parent field must be at response root (WP-compat, M3 contract)
      expect(childBody["parent"]).toBe(parentId);
      expect(childBody["_nodepress"]).toMatchObject({ parent_id: parentId });
    });

    // ─── Case 2: Update menu_order ────────────────────────────────────────────

    it("updates menu_order and returns new value at response root", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Ordered Page",
          content: "Content",
          status: "publish",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body) as Record<string, unknown>;
      expect(created["menu_order"]).toBe(0);

      const updateRes = await app.inject({
        method: "PUT",
        url: `/wp/v2/pages/${created["id"]}`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { menu_order: 5 },
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.body) as Record<string, unknown>;
      expect(updated["menu_order"]).toBe(5);

      // Verify DB
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      const [row] = await testDb
        .select()
        .from(posts)
        .where(eq(posts.id, created["id"] as number));
      expect(row!.menuOrder).toBe(5);
    });

    // ─── Case 3: Slug collision (page slug vs post slug — same table) ─────────

    it("slug collision: page and post share table — unique constraint prevents same slug", async () => {
      // Insert a post directly with slug "shared-slug"
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      await testDb.insert(posts).values({
        type: "post",
        title: "Post With Slug",
        slug: "shared-slug",
        content: "",
        status: "publish",
        authorId: 1,
      });

      // Try to create a PAGE with the same slug — should fail (409)
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Page With Slug",
          content: "",
          slug: "shared-slug",
        },
      });

      // Both pages and posts share the posts table with a unique slug index.
      // Explicit slug collision returns 409, auto-derived returns 400.
      // Since we pass explicit slug, expect 409.
      expect(res.statusCode).toBe(409);
    });

    // ─── Case 4: context=edit returns raw fields ──────────────────────────────

    it("context=edit returns raw content fields for admin", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Edit Context Page",
          content: "<p>Raw content</p>",
          status: "publish",
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.body) as Record<string, unknown>;

      const editRes = await app.inject({
        method: "GET",
        url: `/wp/v2/pages/${created["id"]}?context=edit`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      expect(editRes.statusCode).toBe(200);
      const editBody = JSON.parse(editRes.body) as Record<string, unknown>;

      // context=edit: title and content should include 'raw' key (ADR-009)
      expect(
        (editBody["title"] as Record<string, unknown>)["raw"],
      ).toBeDefined();
      expect(
        (editBody["content"] as Record<string, unknown>)["raw"],
      ).toBeDefined();
    });

    // ─── Case 5: GET /wp/v2/pages does not return posts ───────────────────────

    it("GET /wp/v2/pages returns only pages, not posts", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();

      // Insert one post (type=post) directly
      await testDb.insert(posts).values({
        type: "post",
        title: "A Regular Post",
        slug: "a-regular-post",
        content: "",
        status: "publish",
        authorId: 1,
      });

      // Create one page via API
      await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "A Real Page",
          content: "",
          status: "publish",
        },
      });

      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/pages?status=publish",
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as Array<Record<string, unknown>>;

      // Only the page should appear, not the post
      expect(body).toHaveLength(1);
      expect(body[0]!["slug"]).toBe("a-real-page");
      // _nodepress.type must be "page"
      expect((body[0]!["_nodepress"] as Record<string, unknown>)["type"]).toBe(
        "page",
      );
    });

    // ─── Case 6: 404 for non-existent page ────────────────────────────────────

    it("GET /wp/v2/pages/:id returns 404 for non-existent page", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/wp/v2/pages/99999",
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body)).toMatchObject({ code: "NOT_FOUND" });
    });

    // ─── Case 7: Page with non-existent parent — nullable FK accepted ─────────

    it("creates page with non-existent parent ID — parentId is nullable, no FK constraint", async () => {
      // posts.parent_id has no FK constraint — it's a self-reference modeled as
      // plain integer column. Non-existent parent ID is accepted silently.
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          title: "Orphan Page",
          content: "",
          status: "publish",
          parent: 99999, // does not exist
        },
      });
      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      expect(body["parent"]).toBe(99999);
    });

    // ─── Case 8: status=draft and status=publish isolation ───────────────────

    it("status=draft and status=publish are correctly isolated in listing", async () => {
      await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { title: "Published Page", content: "", status: "publish" },
      });
      await app.inject({
        method: "POST",
        url: "/wp/v2/pages",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { title: "Draft Page", content: "", status: "draft" },
      });

      const pubRes = await app.inject({
        method: "GET",
        url: "/wp/v2/pages?status=publish",
      });
      const draftRes = await app.inject({
        method: "GET",
        url: "/wp/v2/pages?status=draft",
      });

      const pubBody = JSON.parse(pubRes.body) as Array<Record<string, unknown>>;
      const draftBody = JSON.parse(draftRes.body) as Array<
        Record<string, unknown>
      >;

      expect(pubBody).toHaveLength(1);
      expect(pubBody[0]!["status"]).toBe("publish");

      expect(draftBody).toHaveLength(1);
      expect(draftBody[0]!["status"]).toBe("draft");
    });
  },
  { timeout: 120_000 },
);
