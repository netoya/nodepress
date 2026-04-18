import type { FastifyReply, FastifyRequest } from "fastify";
import { db, posts } from "@nodepress/db";
import { eq, and, or, ilike } from "drizzle-orm";
import { toWpPost } from "./serialize.js";
// hooks.ts registers the `hooks` decorator — import side-effect ensures the
// FastifyInstance type augmentation is in scope even though we access the
// registry via request.server.hooks rather than a direct import.
import "../../hooks.js";

/**
 * GET /wp/v2/posts — List posts with pagination and filtering.
 * Public endpoint (no auth required).
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
  const serialized = paginatedPosts.map((p) => toWpPost(p, hooks));

  reply.header("X-WP-Total", total.toString());
  reply.header("X-WP-TotalPages", totalPages.toString());
  return serialized;
}

/**
 * GET /wp/v2/posts/:id — Retrieve a single post by ID.
 * Public endpoint (no auth required).
 */
export async function getPost(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);

  const [post] = await db.select().from(posts).where(eq(posts.id, id));

  if (!post) {
    return reply.status(404).send({
      code: "NOT_FOUND",
      message: `Post ${id} not found.`,
    });
  }

  return toWpPost(post, request.server.hooks);
}

/**
 * POST /wp/v2/posts — Create a new post.
 * Requires admin authentication.
 */
export async function createPost(request: FastifyRequest, reply: FastifyReply) {
  const body = request.body as Record<string, unknown>;
  const {
    title,
    content,
    status = "draft",
    excerpt = "",
    slug,
  } = {
    title: body["title"] as string,
    content: body["content"] as string,
    status: body["status"] as string | undefined,
    excerpt: body["excerpt"] as string | undefined,
    slug: body["slug"] as string | undefined,
  };

  // Auto-generate slug from title if not provided
  const rawSlug =
    slug || title.toLowerCase().replace(/\s+/g, "-").slice(0, 200);

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
    slug: rawSlug,
    authorId,
  };
  const payload = request.server.hooks.applyFilters<PostPayload>(
    "pre_save_post",
    rawPayload,
    { action: "create", userId: request.user?.id },
  );
  // Recompute slug if title was mutated by a filter but no slug was provided
  const finalSlug = slug
    ? payload.slug
    : payload.title.toLowerCase().replace(/\s+/g, "-").slice(0, 200);

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
    // Handle duplicate slug
    if (err instanceof Error && err.message.includes("unique")) {
      return reply.status(400).send({
        code: "INVALID_REQUEST",
        message: "Slug already exists.",
      });
    }
    throw err;
  }
}

/**
 * PUT /wp/v2/posts/:id — Update a post (partial updates allowed).
 * Requires admin authentication.
 */
export async function updatePost(request: FastifyRequest, reply: FastifyReply) {
  const params = request.params as Record<string, unknown>;
  const id = parseInt(params["id"] as string, 10);
  const body = request.body as Record<string, unknown>;
  const { title, content, status, excerpt, slug } = {
    title: body["title"] as string | undefined,
    content: body["content"] as string | undefined,
    status: body["status"] as string | undefined,
    excerpt: body["excerpt"] as string | undefined,
    slug: body["slug"] as string | undefined,
  };

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData["title"] = title;
  if (content !== undefined) updateData["content"] = content;
  if (status !== undefined) updateData["status"] = status;
  if (excerpt !== undefined) updateData["excerpt"] = excerpt;
  if (slug !== undefined) updateData["slug"] = slug;

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
    // Handle duplicate slug
    if (err instanceof Error && err.message.includes("unique")) {
      return reply.status(400).send({
        code: "INVALID_REQUEST",
        message: "Slug already exists.",
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
