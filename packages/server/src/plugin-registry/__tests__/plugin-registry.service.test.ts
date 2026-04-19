import { describe, it, expect, vi, beforeEach } from "vitest";
import { PluginRegistryService } from "../plugin-registry.service.js";

// ---------------------------------------------------------------------------
// Helpers — build mock DB rows
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    slug: "my-plugin",
    name: "My Plugin",
    version: "1.0.0",
    status: "inactive",
    author: null,
    registryUrl: null,
    tarballUrl: null,
    publishedAt: null,
    activatedAt: null,
    errorLog: null,
    meta: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock DB factory — returns a jest-style mock for the Drizzle fluent builder.
// Pattern mirrors what other tests in this project use (taxonomies, bridge).
// ---------------------------------------------------------------------------

function makeDbMock(rows: unknown[] = []) {
  // Shared terminal promise resolved with `rows`
  const terminal = Promise.resolve(rows);

  const builder = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockImplementation(() => terminal),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => terminal),
  };

  return builder;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PluginRegistryService", () => {
  let db: ReturnType<typeof makeDbMock>;
  let service: PluginRegistryService;

  beforeEach(() => {
    db = makeDbMock();

    service = new PluginRegistryService(db as any);
  });

  // ── list ──────────────────────────────────────────────────────────────────

  describe("list()", () => {
    it("returns all plugins when called without filter", async () => {
      const rows = [
        makeRow({ slug: "plugin-a" }),
        makeRow({ slug: "plugin-b" }),
      ];
      db = makeDbMock(rows);

      service = new PluginRegistryService(db as any);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result[0]!.slug).toBe("plugin-a");
      expect(result[1]!.slug).toBe("plugin-b");
    });

    it("passes status filter to the where clause", async () => {
      const rows = [makeRow({ status: "active" })];
      db = makeDbMock(rows);

      service = new PluginRegistryService(db as any);

      const result = await service.list({ status: "active" });

      expect(db.where).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]!.status).toBe("active");
    });

    it("applies default pagination (page=1, perPage=20)", async () => {
      db = makeDbMock([]);

      service = new PluginRegistryService(db as any);

      await service.list();

      expect(db.limit).toHaveBeenCalledWith(20);
      expect(db.offset).toHaveBeenCalledWith(0);
    });

    it("applies custom pagination parameters", async () => {
      db = makeDbMock([]);

      service = new PluginRegistryService(db as any);

      await service.list({ page: 3, perPage: 5 });

      expect(db.limit).toHaveBeenCalledWith(5);
      expect(db.offset).toHaveBeenCalledWith(10);
    });

    it("maps Sprint 6 columns to the entry shape", async () => {
      const publishedAt = new Date("2026-01-01T00:00:00Z");
      const rows = [
        makeRow({
          author: "Jane Dev",
          registryUrl: "https://registry.example.com/my-plugin",
          tarballUrl: "https://cdn.example.com/my-plugin-1.0.0.tgz",
          publishedAt,
        }),
      ];
      db = makeDbMock(rows);

      service = new PluginRegistryService(db as any);

      const [entry] = await service.list();

      expect(entry!.author).toBe("Jane Dev");
      expect(entry!.registryUrl).toBe("https://registry.example.com/my-plugin");
      expect(entry!.tarballUrl).toBe(
        "https://cdn.example.com/my-plugin-1.0.0.tgz",
      );
      expect(entry!.publishedAt).toBe(publishedAt);
    });
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe("get()", () => {
    it("returns the entry when the slug is found", async () => {
      const row = makeRow({ slug: "found-plugin", version: "2.3.4" });

      // get() uses limit(1) — terminal resolves with [row]
      const terminal = Promise.resolve([row]);
      db.select.mockReturnThis();
      db.from.mockReturnThis();
      db.where.mockReturnThis();
      db.limit.mockReturnValue(terminal);

      service = new PluginRegistryService(db as any);

      const entry = await service.get("found-plugin");

      expect(entry).not.toBeNull();
      expect(entry!.slug).toBe("found-plugin");
      expect(entry!.version).toBe("2.3.4");
    });

    it("returns null when the slug is not found", async () => {
      const terminal = Promise.resolve([]); // empty array → not found
      db.select.mockReturnThis();
      db.from.mockReturnThis();
      db.where.mockReturnThis();
      db.limit.mockReturnValue(terminal);

      service = new PluginRegistryService(db as any);

      const entry = await service.get("no-such-plugin");

      expect(entry).toBeNull();
    });
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe("register()", () => {
    it("inserts a new plugin and returns the entry", async () => {
      const inserted = makeRow({
        slug: "new-plugin",
        name: "New Plugin",
        version: "0.1.0",
        author: "Alice",
      });
      const terminal = Promise.resolve([inserted]);
      db.insert.mockReturnThis();
      db.values.mockReturnThis();
      db.onConflictDoUpdate.mockReturnThis();
      db.returning.mockReturnValue(terminal);

      service = new PluginRegistryService(db as any);

      const entry = await service.register({
        slug: "new-plugin",
        name: "New Plugin",
        version: "0.1.0",
        author: "Alice",
      });

      expect(db.insert).toHaveBeenCalled();
      expect(db.onConflictDoUpdate).toHaveBeenCalled();
      expect(entry.slug).toBe("new-plugin");
      expect(entry.author).toBe("Alice");
    });

    it("upserts an existing plugin (onConflictDoUpdate called with correct target)", async () => {
      const updated = makeRow({ slug: "existing-plugin", version: "1.2.0" });
      const terminal = Promise.resolve([updated]);
      db.insert.mockReturnThis();
      db.values.mockReturnThis();
      db.onConflictDoUpdate.mockReturnThis();
      db.returning.mockReturnValue(terminal);

      service = new PluginRegistryService(db as any);

      const entry = await service.register({
        slug: "existing-plugin",
        name: "Existing Plugin",
        version: "1.2.0",
      });

      // onConflictDoUpdate must have been called (upsert path)
      expect(db.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({ version: "1.2.0" }),
        }),
      );
      expect(entry.version).toBe("1.2.0");
    });

    it("includes Sprint 6 fields in the upsert set", async () => {
      const publishedAt = new Date("2026-06-01T00:00:00Z");
      const row = makeRow({
        slug: "sprint6-plugin",
        registryUrl: "https://r.example.com",
        tarballUrl: "https://cdn.example.com/p.tgz",
        publishedAt,
        author: "Bob",
      });
      const terminal = Promise.resolve([row]);
      db.insert.mockReturnThis();
      db.values.mockReturnThis();
      db.onConflictDoUpdate.mockReturnThis();
      db.returning.mockReturnValue(terminal);

      service = new PluginRegistryService(db as any);

      await service.register({
        slug: "sprint6-plugin",
        name: "Sprint6 Plugin",
        version: "1.0.0",
        registryUrl: "https://r.example.com",
        tarballUrl: "https://cdn.example.com/p.tgz",
        publishedAt,
        author: "Bob",
      });

      expect(db.onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            registryUrl: "https://r.example.com",
            tarballUrl: "https://cdn.example.com/p.tgz",
            publishedAt,
            author: "Bob",
          }),
        }),
      );
    });
  });
});
