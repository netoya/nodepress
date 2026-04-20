/**
 * Real-DB integration tests for the Users REST API (M4).
 *
 * Tests run against a real Postgres instance via @testcontainers/postgresql.
 * Automatically skipped when DOCKER_AVAILABLE=false.
 *
 * Run via:  npm run test:integration
 *
 * Covered cases (6 minimum per spec):
 *  1. POST /wp/v2/users — creates user, returns 201 without password or passwordHash
 *  2. GET /wp/v2/users/:id — public shape, no email field
 *  3. PUT — rotates hash when password is explicit in body
 *  4. PUT — does NOT rotate hash when password is absent from body
 *  5. DELETE with ?reassign — reassigns posts in transaction, deletes user
 *  6. DELETE without ?reassign when user has posts — returns 409
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
  "Users API — real Postgres integration",
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
      const usersPlugin = await import("../index.js");

      app = Fastify();
      await registerBearerAuth(app);
      await registerHooks(app);
      await app.register(usersPlugin.default);
      await app.ready();

      // Seed admin user (id=1) for requireAdmin auth
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

    // ─── Test 1: POST creates user, no password/passwordHash in response ──────

    it("POST /wp/v2/users — creates user, 201, no password or passwordHash in response", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/wp/v2/users",
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: {
          username: "newuser",
          email: "new@example.com",
          password: "securepass123",
          displayName: "New User",
          roles: ["author"],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body) as Record<string, unknown>;

      // Basic WP shape
      expect(body["id"]).toBeTypeOf("number");
      expect(body["name"]).toBe("New User");
      expect(body["slug"]).toBe("newuser");
      expect(body["roles"]).toEqual(["author"]);

      // ADR-026 §2: password and passwordHash MUST NOT be in response
      expect(body).not.toHaveProperty("password");
      expect(body).not.toHaveProperty("passwordHash");

      // Verify DB row exists with a real bcrypt hash
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.login, "newuser"));
      expect(row).toBeDefined();
      expect(row!.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    // ─── Test 2: GET /:id public shape — no email ─────────────────────────────

    it("GET /wp/v2/users/:id — public shape without email field", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      const [created] = await testDb
        .insert(users)
        .values({
          login: "alice",
          email: "alice@example.com",
          displayName: "Alice",
          passwordHash: "hashed",
          roles: ["editor"],
        })
        .returning();

      const res = await app.inject({
        method: "GET",
        url: `/wp/v2/users/${created!.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      expect(body["id"]).toBe(created!.id);
      expect(body["slug"]).toBe("alice");
      // Public shape must not expose email
      expect(body).not.toHaveProperty("email");
      expect(body).not.toHaveProperty("passwordHash");
      // Public shape has avatar_urls
      expect(body["avatar_urls"]).toBeDefined();
    });

    // ─── Test 3: PUT with password — rotates hash ─────────────────────────────

    it("PUT /wp/v2/users/:id — rotates passwordHash when password is in body", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      const [created] = await testDb
        .insert(users)
        .values({
          login: "bob",
          email: "bob@example.com",
          displayName: "Bob",
          passwordHash: "original-placeholder-hash",
          roles: ["author"],
        })
        .returning();

      const res = await app.inject({
        method: "PUT",
        url: `/wp/v2/users/${created!.id}`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { password: "newpassword456" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      // Password never in response
      expect(body).not.toHaveProperty("password");
      expect(body).not.toHaveProperty("passwordHash");

      // Hash in DB should have changed and be a real bcrypt hash
      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, created!.id));
      expect(row!.passwordHash).not.toBe("original-placeholder-hash");
      expect(row!.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    // ─── Test 4: PUT without password — hash is preserved ────────────────────

    it("PUT /wp/v2/users/:id — does NOT rotate passwordHash when password absent", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();
      const ORIGINAL_HASH = "original-placeholder-hash-untouched";
      const [created] = await testDb
        .insert(users)
        .values({
          login: "carol",
          email: "carol@example.com",
          displayName: "Carol",
          passwordHash: ORIGINAL_HASH,
          roles: ["author"],
        })
        .returning();

      // Update only displayName — no password field in body
      const res = await app.inject({
        method: "PUT",
        url: `/wp/v2/users/${created!.id}`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        payload: { displayName: "Carol Updated" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      expect(body["name"]).toBe("Carol Updated");

      // Hash must be byte-identical — not rotated (ADR-026 §3)
      const [row] = await testDb
        .select()
        .from(users)
        .where(eq(users.id, created!.id));
      expect(row!.passwordHash).toBe(ORIGINAL_HASH);
    });

    // ─── Test 5: DELETE with ?reassign — posts reassigned in transaction ──────

    it("DELETE /wp/v2/users/:id?reassign — reassigns posts and deletes user atomically", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();

      // Create user to delete
      const [target] = await testDb
        .insert(users)
        .values({
          login: "dave",
          email: "dave@example.com",
          displayName: "Dave",
          passwordHash: "hashed",
          roles: ["author"],
        })
        .returning();

      // Create a post authored by Dave
      const [post] = await testDb
        .insert(posts)
        .values({
          title: "Dave Post",
          slug: "dave-post",
          content: "Hello",
          status: "publish",
          authorId: target!.id,
        })
        .returning();

      // DELETE Dave, reassign posts to admin (id=1)
      const res = await app.inject({
        method: "DELETE",
        url: `/wp/v2/users/${target!.id}?reassign=1`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      expect(body["deleted"]).toBe(true);

      // Dave should be gone
      const userRows = await testDb
        .select()
        .from(users)
        .where(eq(users.id, target!.id));
      expect(userRows).toHaveLength(0);

      // Post should now belong to admin (id=1)
      const [postRow] = await testDb
        .select()
        .from(posts)
        .where(eq(posts.id, post!.id));
      expect(postRow!.authorId).toBe(1);
    });

    // ─── Test 6: DELETE without ?reassign when user has posts → 409 ──────────

    it("DELETE /wp/v2/users/:id — returns 409 when user has posts and no ?reassign", async () => {
      const { getTestDb } = await import("../../../__tests__/helpers/db.js");
      const testDb = getTestDb();

      // Create user with a post
      const [target] = await testDb
        .insert(users)
        .values({
          login: "eve",
          email: "eve@example.com",
          displayName: "Eve",
          passwordHash: "hashed",
          roles: ["author"],
        })
        .returning();

      await testDb.insert(posts).values({
        title: "Eve Post",
        slug: "eve-post",
        content: "Hello",
        status: "publish",
        authorId: target!.id,
      });

      const res = await app.inject({
        method: "DELETE",
        url: `/wp/v2/users/${target!.id}`,
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body) as Record<string, unknown>;
      expect(body["code"]).toBe("USER_HAS_CONTENT");

      // User must still exist
      const userRows = await testDb
        .select()
        .from(users)
        .where(eq(users.id, target!.id));
      expect(userRows).toHaveLength(1);
    });
  },
  { timeout: 120_000 },
);
