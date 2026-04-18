import type { FastifyReply, FastifyRequest } from "fastify";
import { db, posts } from "@nodepress/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { toWpPost, toWpPostAsync, type SerializeContext } from "./serialize.js";
import { requireAdmin } from "../../auth/bearer.js";
import { deriveSlug, findAvailableSlug } from "./slug.js";
import { renderShortcodes } from "../../bridge/index.js";
// hooks.ts registers the `hooks` decorator — import side-effect ensures the
// FastifyInstance type augmentation is in scope even though we access the
// registry via request.server.hooks rather than a direct import.
import "../../hooks.js";

/**
 * GET /wp/v2/posts — List posts with pagination and filtering.
 * Public endpoint (no auth required).
 * When NODEPRESS_TIER2=true, pre-processes content via renderShortcodes before
 * applying the_content filter chain.
 */
export async function listPosts(request: FastifyRequest, reply: FastifyReply) {
  const query = request.query as Record<string, unknown>;
  const page = Math.max(1, parseInt((query["page"] as string) ?? "1", 10));
  const perPage = Math.min(
    100,
    Math.max(1, parseInt((query["per_page"] as string) ?? "10", 10)),
  );
  const search = (query["search"] as string) ?? "";
  const status = (query["status"] as string) ?? "publish";
  const rawContext = (query["context"] as string) ?? "view";

  // context=edit exposes raw fields — requires admin auth (ADR-009)
  if (rawContext === "edit") {
    await requireAdmin(request, reply);
    if (reply.sent) return;
  }
  const context: SerializeContext = rawContext === "edit" ? "edit" : "view";

  // Build WHERE conditions
  const conditions = [];

  // Filter by status
  conditions.push(eq(posts.status, status));

  // Filter by search (title or content)
  if (search) {
    conditions.push(
      or(
        ilike(posts.title, `%${search}%`),
        ilike(posts.content, `%${search}%`),
      ),
    );
  }

  // Fetch total count and paginated results
  const allMatchingPosts = await db
    .select()
    .from(posts)
    .where(and(...conditions));

  const total = allMatchingPosts.length;
  const offset = (page - 1) * perPage;
  const totalPages = Math.ceil(total / perPage);

  const paginatedPosts = allMatchingPosts.slice(offset, offset + perPage);
  const hooks = request.server.hooks;

  // Use async version if Tier 2 bridge is active
  const useBridge = process.env["NODEPRESS_TIER2"] === "true";
  const serialized = useBridge
    ? await Promise.all(
        paginatedPosts.map((p) =>
          toWpPostAsync(p, hooks, { renderShortcodes }, context),
        ),
      )
    : paginatedPosts.map((p) => toWpPost(p, hooks, context));

  reply.header("X-WP-Total", total.toString());
  reply.header("X-WP-TotalPages", totalPages.toString());
  return serialized;
}

/**
 * GET /wp/v2/posts/:id — Retrieve a single post by ID.
 * Public endpoint (no auth required).
 * When NODEPRESS_TIER2=true, pre-processes content via renderShortcodes before
 * applying the_content filter chain.
 */
export async function getPost(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const query = request.query as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const rawContext = (query["context"] as string) ?? "view";

  // context=edit exposes raw fields — requires admin auth (ADR-009)
  if (rawContext === "edit") {
    await requireAdmin(request, reply);
    if (reply.sent) return;
  }
  const context: SerializeContext = rawContext === "edit" ? "edit" : "view";

  const [post] = await db.select().from(posts).where(eq(posts.id, id));

  if (!post) {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Post ${id} not found.`,
    });
  }

  // Use async version if Tier 2 bridge is active
  const useBridge = process.env["NODEPRESS_TIER2"] === "true";
  return useBridge
    ? await toWpPostAsync(
        post,
        request.server.hooks,
        { renderShortcodes },
        context,
      )
    : toWpPost(post, request.server.hooks, context);
}

/**
 * POST /wp/v2/posts — Create a new post.
 * Requires admin authentication.
 * Implements WordPress-compatible slug auto-suffixing: if slug exists, tries -2, -3, etc.
 */
export async function createPost(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, unknown>;
  const {
    title,
    content,
    status = "draft",
    excerpt = "",
    slug: explicitSlug,
  } = {
    title: body["title"] as string,
    content: body["content"] as string,
    status: body["status"] as string | undefined,
    excerpt: body["excerpt"] as string | undefined,
    slug: body["slug"] as string | undefined,
  };

  // For now, default authorId to 1 (admin user).
  // In production, this should come from the authenticated user context.
  const authorId = 1;

  /**
   * Apply the `pre_save_post` filter (sync) before writing to the DB.
   * Signature: (postData: PostPayload, meta: PreSavePostMeta) => PostPayload
   * PostPayload carries the mutable fields; meta is read-only context.
   */
  interface PostPayload {
    title: string;
    content: string;
    status: string;
    excerpt: string;
    slug: string;
    authorId: number;
  }
  const rawPayload: PostPayload = {
    title,
    content,
    status,
    excerpt: excerpt ?? "",
    slug: explicitSlug || deriveSlug(title),
    authorId,
  };
  const payload = request.server.hooks.applyFilters<PostPayload>(
    "pre_save_post",
    rawPayload,
    { action: "create", userId: request.user?.id },
  );

  // Determine final slug with collision handling
  let finalSlug: string;
  if (explicitSlug) {
    // Caller provided explicit slug — use filter-mutated version, no auto-suffix
    finalSlug = payload.slug;
  } else {
    // Auto-derived slug — apply auto-suffix if collision
    const baseSlug = payload.slug;
    finalSlug = await findAvailableSlug(baseSlug, async (s: string) => {
      const existing = await db.select().from(posts).where(eq(posts.slug, s));
      return existing.length > 0;
    });
  }

  try {
    const [created] = await db
      .insert(posts)
      .values({
        title: payload.title,
        content: payload.content,
        status: payload.status,
        excerpt: payload.excerpt,
        slug: finalSlug,
        authorId: payload.authorId,
      })
      .returning();

    return reply.status(201).send(toWpPost(created!, request.server.hooks));
  } catch (err: unknown) {
    // Handle explicit slug collision — 409 if caller was explicit
    if (err instanceof Error && err.message.includes("unique")) {
      const statusCode = explicitSlug ? 409 : 400;
      const message = explicitSlug
        ? "Slug already exists (explicit slug collision)."
        : "Slug collision (no available suffix found).";
      return reply.status(statusCode).send({
        code: explicitSlug ? "SLUG_COLLISION" : "INVALID_REQUEST",
        message,
      });
    }
    throw err;
  }
}

/**
 * PUT /wp/v2/posts/:id — Update a post (partial updates allowed).
 * Requires admin authentication.
 * If title is updated without explicit slug, re-derives slug and applies auto-suffix if collision.
 */
export async function updatePost(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const body = request.body as Record<string, unknown>;
  const {
    title,
    content,
    status,
    excerpt,
    slug: explicitSlug,
  } = {
    title: body["title"] as string | undefined,
    content: body["content"] as string | undefined,
    status: body["status"] as string | undefined,
    excerpt: body["excerpt"] as string | undefined,
    slug: body["slug"] as string | undefined,
  };

  // Fetch current post to determine slug derivation
  const [currentPost] = await db.select().from(posts).where(eq(posts.id, id));

  if (!currentPost) {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Post ${id} not found.`,
    });
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData["title"] = title;
  if (content !== undefined) updateData["content"] = content;
  if (status !== undefined) updateData["status"] = status;
  if (excerpt !== undefined) updateData["excerpt"] = excerpt;

  // Handle slug: if title changed and no explicit slug, re-derive and apply auto-suffix
  let finalSlug: string | undefined;
  if (explicitSlug !== undefined) {
    finalSlug = explicitSlug;
    updateData["slug"] = finalSlug;
  } else if (title !== undefined) {
    // Title is being updated without explicit slug — re-derive
    const baseSlug = deriveSlug(title);
    finalSlug = await findAvailableSlug(baseSlug, async (s: string) => {
      // Only consider OTHER posts (not current post itself)
      const allWithSlug = await db
        .select()
        .from(posts)
        .where(eq(posts.slug, s));
      // If only result is current post (same id), it's not a collision
      return allWithSlug.length > 0 && !allWithSlug.some((p) => p.id === id);
    });
    updateData["slug"] = finalSlug;
  }

  // Ensure at least one field is provided
  if (Object.keys(updateData).length === 0) {
    return reply.status(400).send({
      code: "INVALID_REQUEST",
      message: "At least one field must be provided.",
    });
  }

  /**
   * Apply the `pre_save_post` filter (sync) before writing to the DB.
   * Only the provided (partial) fields are mutated; absent fields remain undefined.
   * Signature: (postData: Record<string, unknown>, meta: PreSavePostMeta) => Record<string, unknown>
   */
  const mutatedData = request.server.hooks.applyFilters<
    Record<string, unknown>
  >("pre_save_post", updateData, {
    action: "update",
    userId: request.user?.id,
  });

  try {
    const [updated] = await db
      .update(posts)
      .set(mutatedData)
      .where(eq(posts.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: `Post ${id} not found.`,
      });
    }

    return toWpPost(updated, request.server.hooks);
  } catch (err: unknown) {
    // Handle explicit slug collision — 409 if caller was explicit
    if (err instanceof Error && err.message.includes("unique")) {
      const statusCode = explicitSlug !== undefined ? 409 : 400;
      const message =
        explicitSlug !== undefined
          ? "Slug already exists (explicit slug collision)."
          : "Slug collision (no available suffix found).";
      return reply.status(statusCode).send({
        code: explicitSlug !== undefined ? "SLUG_COLLISION" : "INVALID_REQUEST",
        message,
      });
    }
    throw err;
  }
}

/**
 * DELETE /wp/v2/posts/:id — Delete a post (soft or hard delete).
 * Soft delete: set status to trash. Hard delete: remove from DB.
 * Requires admin authentication.
 */
export async function deletePost(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const query = request.query as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const force = (query["force"] as string) === "true";

  // Fetch the post first to return its pre-deletion state
  const [post] = await db.select().from(posts).where(eq(posts.id, id));

  if (!post) {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Post ${id} not found.`,
    });
  }

  const hooks = request.server.hooks;

  if (force) {
    // Hard delete
    await db.delete(posts).where(eq(posts.id, id));
    return {
      deleted: true,
      previous: toWpPost(post, hooks),
    };
  } else {
    // Soft delete: set status to trash
    const [trashed] = await db
      .update(posts)
      .set({ status: "trash" })
      .where(eq(posts.id, id))
      .returning();

    return toWpPost(trashed!, hooks);
  }
}
