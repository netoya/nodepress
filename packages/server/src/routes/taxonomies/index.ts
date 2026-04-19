import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { db, terms, termRelationships } from "@nodepress/db";
import { eq, and, ilike, or, sql, asc, desc } from "drizzle-orm";

/**
 * WP REST API v2 term shape.
 * Sprint 3: parent is always 0 (flat taxonomy, no hierarchy).
 * count is computed from term_relationships.
 */
export interface WpTerm {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
}

/**
 * Map a DB row (with injected count) to the WP REST API term shape.
 */
export function toWpTerm(
  row: typeof terms.$inferSelect & { count: number },
  taxonomy: "category" | "post_tag",
): WpTerm {
  const segment = taxonomy === "category" ? "categories" : "tags";
  return {
    id: row.id,
    count: row.count,
    description: row.description,
    link: `/wp/v2/${segment}/${row.id}`,
    name: row.name,
    slug: row.slug,
    taxonomy,
    parent: 0,
  };
}

const VALID_ORDERBY = ["id", "name", "slug", "count"] as const;
type Orderby = (typeof VALID_ORDERBY)[number];

/**
 * Build ORDER BY expression for the terms query.
 */
function buildOrderExpr(orderby: Orderby, order: "asc" | "desc") {
  const dir = order === "asc" ? asc : desc;
  switch (orderby) {
    case "id":
      return dir(terms.id);
    case "slug":
      return dir(terms.slug);
    case "count":
      // count is a subquery alias — order by id as proxy
      return dir(terms.id);
    case "name":
    default:
      return dir(terms.name);
  }
}

/**
 * Fetch a paginated list of terms for a given taxonomy.
 * Computes count via a correlated subquery in SELECT.
 */
export async function listTerms(
  taxonomy: "category" | "post_tag",
  opts: {
    page: number;
    perPage: number;
    search: string;
    order: "asc" | "desc";
    orderby: Orderby;
  },
): Promise<{ rows: WpTerm[]; total: number }> {
  // Correlated subquery: count posts linked to each term
  const countSq = db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(termRelationships)
    .where(eq(termRelationships.termId, terms.id));

  // Build WHERE: taxonomy filter + optional search
  const taxFilter = eq(terms.taxonomy, taxonomy);
  const searchFilter = opts.search
    ? or(
        ilike(terms.name, `%${opts.search}%`),
        ilike(terms.slug, `%${opts.search}%`),
      )
    : undefined;
  const whereClause = searchFilter ? and(taxFilter, searchFilter) : taxFilter;

  const allRows = await db
    .select({
      id: terms.id,
      taxonomy: terms.taxonomy,
      name: terms.name,
      slug: terms.slug,
      description: terms.description,
      parentId: terms.parentId,
      meta: terms.meta,
      count: sql<number>`(${countSq})`,
    })
    .from(terms)
    .where(whereClause)
    .orderBy(buildOrderExpr(opts.orderby, opts.order));

  const total = allRows.length;
  const offset = (opts.page - 1) * opts.perPage;
  const paginated = allRows.slice(offset, offset + opts.perPage);

  const wpTerms = paginated.map((r) =>
    toWpTerm({ ...r, count: r.count ?? 0 }, taxonomy),
  );

  return { rows: wpTerms, total };
}

/**
 * Fetch a single term by ID and taxonomy.
 * Returns null if not found or taxonomy does not match.
 */
export async function getTermById(
  taxonomy: "category" | "post_tag",
  id: number,
): Promise<WpTerm | null> {
  const countSq = db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(termRelationships)
    .where(eq(termRelationships.termId, terms.id));

  const [row] = await db
    .select({
      id: terms.id,
      taxonomy: terms.taxonomy,
      name: terms.name,
      slug: terms.slug,
      description: terms.description,
      parentId: terms.parentId,
      meta: terms.meta,
      count: sql<number>`(${countSq})`,
    })
    .from(terms)
    .where(and(eq(terms.id, id), eq(terms.taxonomy, taxonomy)));

  if (!row) return null;

  return toWpTerm({ ...row, count: row.count ?? 0 }, taxonomy);
}

// --- Query param parsing ---

function parseListParams(query: Record<string, unknown>) {
  const page = Math.max(1, parseInt((query["page"] as string) ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt((query["per_page"] as string) ?? "10", 10)),
  );
  const search = (query["search"] as string) ?? "";
  const rawOrder = (query["order"] as string) ?? "asc";
  const order: "asc" | "desc" = rawOrder === "desc" ? "desc" : "asc";
  const rawOrderby = (query["orderby"] as string) ?? "name";
  const orderby: Orderby = VALID_ORDERBY.includes(rawOrderby as Orderby)
    ? (rawOrderby as Orderby)
    : "name";

  return { page, perPage, search, order, orderby };
}

// --- Fastify route handlers ---

async function handleListTerms(
  taxonomy: "category" | "post_tag",
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const opts = parseListParams(request.query as Record<string, unknown>);
  const { rows, total } = await listTerms(taxonomy, opts);
  const totalPages = Math.ceil(total / opts.perPage) || 1;

  reply.header("X-WP-Total", total.toString());
  reply.header("X-WP-TotalPages", totalPages.toString());
  return rows;
}

async function handleGetTerm(
  taxonomy: "category" | "post_tag",
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);

  const term = await getTermById(taxonomy, id);
  if (!term) {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Term ${id} not found.`,
    });
  }
  return term;
}

// --- Fastify JSON schema ---

const WpTermSchema = {
  type: "object" as const,
  required: [
    "id",
    "count",
    "description",
    "link",
    "name",
    "slug",
    "taxonomy",
    "parent",
  ],
  properties: {
    id: { type: "integer" },
    count: { type: "integer" },
    description: { type: "string" },
    link: { type: "string" },
    name: { type: "string" },
    slug: { type: "string" },
    taxonomy: { type: "string" },
    parent: { type: "integer" },
  },
};

const ErrorResponseSchema = {
  type: "object" as const,
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
  },
};

// --- Fastify plugin registration ---

export default fp(async (app: FastifyInstance) => {
  // GET /wp/v2/categories — list categories (public)
  app.get(
    "/wp/v2/categories",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            per_page: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
            search: { type: "string" },
            order: {
              type: "string",
              enum: ["asc", "desc"],
              default: "asc",
            },
            orderby: {
              type: "string",
              enum: ["id", "name", "slug", "count"],
              default: "name",
            },
          },
        },
        response: {
          200: { type: "array", items: WpTermSchema },
        },
      },
    },
    (req, rep) => handleListTerms("category", req, rep),
  );

  // GET /wp/v2/categories/:id — get single category (public)
  app.get(
    "/wp/v2/categories/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        response: {
          200: WpTermSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (req, rep) => handleGetTerm("category", req, rep),
  );

  // GET /wp/v2/tags — list tags (public)
  app.get(
    "/wp/v2/tags",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            per_page: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
            search: { type: "string" },
            order: {
              type: "string",
              enum: ["asc", "desc"],
              default: "asc",
            },
            orderby: {
              type: "string",
              enum: ["id", "name", "slug", "count"],
              default: "name",
            },
          },
        },
        response: {
          200: { type: "array", items: WpTermSchema },
        },
      },
    },
    (req, rep) => handleListTerms("post_tag", req, rep),
  );

  // GET /wp/v2/tags/:id — get single tag (public)
  app.get(
    "/wp/v2/tags/:id",
    {
      schema: {
        params: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "integer" },
          },
        },
        response: {
          200: WpTermSchema,
          404: ErrorResponseSchema,
        },
      },
    },
    (req, rep) => handleGetTerm("post_tag", req, rep),
  );
});
