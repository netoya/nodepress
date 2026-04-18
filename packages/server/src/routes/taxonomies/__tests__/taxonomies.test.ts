/**
 * Unit tests for GET /wp/v2/categories and GET /wp/v2/tags.
 * DB module is fully mocked — no real Postgres connection required.
 *
 * Handler uses: db.select({...}).from(...).where(...).orderBy(...)
 * For single-row: db.select({...}).from(...).where(...)  → array (destructured)
 *
 * Mock strategy: fluent builder where every method returns `this`,
 * and orderBy/where (when terminal) returns a resolved Promise of mockTermRows.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";

// --- Shared mock state ---
const mockTermRows: {
  id: number;
  taxonomy: string;
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  meta: Record<string, unknown>;
  count: number;
}[] = [];

function seedTerms(rows: typeof mockTermRows) {
  mockTermRows.length = 0;
  mockTermRows.push(...rows);
}

// Fluent query builder mock
// orderBy resolves → used in listTerms
// where resolves AND is iterable (destructured in getTermById)
function makeQueryMock() {
  const chainable: Record<string, unknown> = {};

  // Terminal: orderBy resolves with all rows
  chainable["orderBy"] = () => Promise.resolve([...mockTermRows]);

  // where resolves with all rows AND is thenable (for await destructure)
  // This works because JS awaits the thenable Promise.
  const withWhere = () => {
    const p = Promise.resolve([...mockTermRows]) as Promise<
      typeof mockTermRows
    > & {
      from: () => typeof wf;
      where: () => typeof wf;
      orderBy: () => Promise<typeof mockTermRows>;
    };
    // attach fluent methods on the promise so chained calls work
    p.from = () => wf;
    p.where = () => wf;
    p.orderBy = () => Promise.resolve([...mockTermRows]);
    return p;
  };

  const wf = {
    from: () => wf,
    where: () => withWhere(),
    orderBy: () => Promise.resolve([...mockTermRows]),
  };

  return {
    select: () => wf,
  };
}

vi.mock("@nodepress/db", () => {
  return {
    db: makeQueryMock(),
    terms: { id: "id", taxonomy: "taxonomy", name: "name", slug: "slug" },
    termRelationships: { termId: "termId" },
  };
});

vi.mock("drizzle-orm", async () => {
  const actual =
    await vi.importActual<typeof import("drizzle-orm")>("drizzle-orm");
  return {
    ...actual,
    sql: Object.assign(
      (_tpl: TemplateStringsArray, ..._vals: unknown[]) => "COUNT_SUBQUERY",
      { raw: (_s: string) => "COUNT_SUBQUERY" },
    ),
    eq: (_col: unknown, _val: unknown) => "eq_cond",
    and: (..._args: unknown[]) => "and_cond",
    or: (..._args: unknown[]) => "or_cond",
    ilike: (_col: unknown, _pat: unknown) => "ilike_cond",
    asc: (_col: unknown) => "asc_expr",
    desc: (_col: unknown) => "desc_expr",
  };
});

// Import AFTER mocks are registered
import taxonomiesPlugin from "../index.js";

// --- Test data ---
const categoryRow = {
  id: 1,
  taxonomy: "category",
  name: "Uncategorized",
  slug: "uncategorized",
  description: "",
  parentId: null,
  meta: {},
  count: 3,
};

const tagRow = {
  id: 2,
  taxonomy: "post_tag",
  name: "News",
  slug: "news",
  description: "Latest news",
  parentId: null,
  meta: {},
  count: 5,
};

// --- App factory ---
async function buildTestApp() {
  const app = Fastify({ logger: false });
  await app.register(taxonomiesPlugin);
  return app;
}

// ─── Tests ───

describe("GET /wp/v2/categories", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    seedTerms([categoryRow]);
    app = await buildTestApp();
  });

  it("returns 200 with an array", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/categories" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("returns WpTerm shape with required fields", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/categories" });
    expect(res.statusCode).toBe(200);
    const body = res.json<
      {
        id: number;
        count: number;
        description: string;
        link: string;
        name: string;
        slug: string;
        taxonomy: string;
        parent: number;
      }[]
    >();
    expect(body.length).toBeGreaterThan(0);
    const term = body[0]!;
    expect(typeof term.id).toBe("number");
    expect(typeof term.count).toBe("number");
    expect(typeof term.description).toBe("string");
    expect(term.link).toContain("categories");
    expect(typeof term.name).toBe("string");
    expect(typeof term.slug).toBe("string");
    expect(term.taxonomy).toBe("category");
    expect(term.parent).toBe(0);
  });

  it("sets X-WP-Total and X-WP-TotalPages headers", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/categories" });
    expect(res.statusCode).toBe(200);
    expect(res.headers["x-wp-total"]).toBeDefined();
    expect(res.headers["x-wp-totalpages"]).toBeDefined();
  });
});

describe("GET /wp/v2/categories/:id", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    seedTerms([categoryRow]);
    app = await buildTestApp();
  });

  it("returns 200 with WpTerm for existing category", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/categories/1" });
    expect(res.statusCode).toBe(200);
    const term = res.json<{ id: number; taxonomy: string; parent: number }>();
    expect(term.id).toBe(1);
    expect(term.taxonomy).toBe("category");
    expect(term.parent).toBe(0);
  });

  it("returns 404 for non-existent category", async () => {
    seedTerms([]);
    const res = await app.inject({
      method: "GET",
      url: "/wp/v2/categories/999",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json<{ code: string }>().code).toBe("NOT_FOUND");
  });
});

describe("GET /wp/v2/tags", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    seedTerms([tagRow]);
    app = await buildTestApp();
  });

  it("returns 200 with an array", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/tags" });
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.json())).toBe(true);
  });

  it("returns correct taxonomy=post_tag in response", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/tags" });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ taxonomy: string; link: string }[]>();
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]!.taxonomy).toBe("post_tag");
    expect(body[0]!.link).toContain("tags");
  });
});

describe("GET /wp/v2/tags/:id", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeEach(async () => {
    seedTerms([tagRow]);
    app = await buildTestApp();
  });

  it("returns 200 with tag shape for existing tag", async () => {
    const res = await app.inject({ method: "GET", url: "/wp/v2/tags/2" });
    expect(res.statusCode).toBe(200);
    const term = res.json<{ id: number; taxonomy: string; name: string }>();
    expect(term.id).toBe(2);
    expect(term.taxonomy).toBe("post_tag");
    expect(term.name).toBe("News");
  });

  it("returns 404 for non-existent tag", async () => {
    seedTerms([]);
    const res = await app.inject({ method: "GET", url: "/wp/v2/tags/999" });
    expect(res.statusCode).toBe(404);
  });
});
