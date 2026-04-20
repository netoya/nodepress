import type { FastifyReply, FastifyRequest } from "fastify";
import { db, posts, termRelationships } from "@nodepress/db";
import { eq, and, or, ilike } from "drizzle-orm";
import {
  toWpPost,
  toWpPostAsync,
  loadPostTerms,
  type SerializeContext,
} from "./serialize.js";
import { requireAdmin } from "../../auth/bearer.js";
import { deriveSlug, findAvailableSlug } from "./slug.js";
import { renderShortcodes } from "../../bridge/index.js";
// hooks.ts registers the `hooks` decorator — import side-effect ensures the
// FastifyInstance type augmentation is in scope even though we access the
// registry via request.server.hooks rather than a direct import.
import "../../hooks.js";

/**
 * Factory function that creates a set of post handlers for a specific post type.
 * Parametrizes listPosts, getPost, createPost, updatePost, and deletePost with
 * the given postType, ensuring proper filtering and type assignment.
 *
 * ADR-025: This factory pattern enables pages (type="page") and posts (type="post")
 * to share the same implementation logic without duplication.
 *
 * @param postType The post type to filter on (e.g., "post", "page").
 */
export function createPostHandler(postType: string) {
  /**
   * GET /wp/v2/{posts|pages} — List posts/pages with pagination and filtering.
   * Public endpoint (no auth required).
   * Filters by the specified postType.
   * When NODEPRESS_TIER2=true, pre-processes content via renderShortcodes before
   * applying the_content filter chain.
   */
  async function listPostsOfType(request: FastifyRequest, reply: FastifyReply) {
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
    const conditions = [eq(posts.type, postType), eq(posts.status, status)];

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
   * GET /wp/v2/{posts|pages}/:id — Retrieve a single post/page by ID.
   * Public endpoint (no auth required).
   * Filters by the specified postType.
   * When NODEPRESS_TIER2=true, pre-processes content via renderShortcodes before
   * applying the_content filter chain.
   */
  async function getPostOfType(request: FastifyRequest, reply: FastifyReply) {
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

    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.type, postType)));

    if (!post) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: `${postType} ${id} not found.`,
      });
    }

    // Load categories and tags from database
    const [categories, tags] = await loadPostTerms(id);

    // Use async version if Tier 2 bridge is active
    const useBridge = process.env["NODEPRESS_TIER2"] === "true";
    return useBridge
      ? await toWpPostAsync(
          post,
          request.server.hooks,
          { renderShortcodes },
          context,
        )
      : toWpPost(post, request.server.hooks, context, categories, tags);
  }

  /**
   * POST /wp/v2/{posts|pages} — Create a new post/page.
   * Requires admin authentication.
   * Implements WordPress-compatible slug auto-suffixing: if slug exists, tries -2, -3, etc.
   * Accepts optional categories and tags arrays; persists to term_relationships.
   * Extracts authorId from authenticated request context (request.user.id).
   */
  async function createPostOfType(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const body = request.body as Record<string, unknown>;
    const {
      title,
      content,
      status = "draft",
      excerpt = "",
      slug: explicitSlug,
      parent,
      menu_order,
      categories = [],
      tags = [],
    } = {
      title: body["title"] as string,
      content: body["content"] as string,
      status: body["status"] as string | undefined,
      excerpt: body["excerpt"] as string | undefined,
      slug: body["slug"] as string | undefined,
      parent: body["parent"] as number | undefined,
      menu_order: body["menu_order"] as number | undefined,
      categories: (body["categories"] as number[] | undefined) ?? [],
      tags: (body["tags"] as number[] | undefined) ?? [],
    };

    // Use authenticated user's ID if available; fallback to 1
    const authorId = request.user?.id ?? 1;

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
          type: postType,
          title: payload.title,
          content: payload.content,
          status: payload.status,
          excerpt: payload.excerpt,
          slug: finalSlug,
          authorId: payload.authorId,
          parentId: parent ?? null,
          menuOrder: menu_order ?? 0,
        })
        .returning();

      // Persist term relationships (categories and tags)
      const termIds = [...new Set([...categories, ...tags])]; // Deduplicate
      if (termIds.length > 0 && created) {
        // Silently ignore non-existent term IDs (no validation against DB)
        await Promise.all(
          termIds.map((termId) =>
            db
              .insert(termRelationships)
              .values({
                postId: created.id,
                termId,
                order: 0,
              })
              .catch(() => {
                // Silently ignore FK constraint violations (non-existent terms)
              }),
          ),
        );
      }

      // Load fresh relationships and return serialized post
      const [loadedCategories, loadedTags] = await loadPostTerms(created!.id);
      return reply
        .status(201)
        .send(
          toWpPost(
            created!,
            request.server.hooks,
            "view",
            loadedCategories,
            loadedTags,
          ),
        );
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
   * PUT /wp/v2/{posts|pages}/:id — Update a post/page (partial updates allowed).
   * Requires admin authentication.
   * If title is updated without explicit slug, re-derives slug and applies auto-suffix if collision.
   * Accepts optional categories and tags arrays; replaces all existing term_relationships (idempotent).
   */
  async function updatePostOfType(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const params = request.params as Record<string, unknown>;
    const id = parseInt(params["id"] as string, 10);
    const body = request.body as Record<string, unknown>;
    const {
      title,
      content,
      status,
      excerpt,
      slug: explicitSlug,
      parent,
      menu_order,
      categories,
      tags,
    } = {
      title: body["title"] as string | undefined,
      content: body["content"] as string | undefined,
      status: body["status"] as string | undefined,
      excerpt: body["excerpt"] as string | undefined,
      slug: body["slug"] as string | undefined,
      parent: body["parent"] as number | undefined,
      menu_order: body["menu_order"] as number | undefined,
      categories: body["categories"] as number[] | undefined,
      tags: body["tags"] as number[] | undefined,
    };

    // Fetch current post to determine slug derivation
    const [currentPost] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.type, postType)));

    if (!currentPost) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: `${postType} ${id} not found.`,
      });
    }

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData["title"] = title;
    if (content !== undefined) updateData["content"] = content;
    if (status !== undefined) updateData["status"] = status;
    if (excerpt !== undefined) updateData["excerpt"] = excerpt;
    if (parent !== undefined) updateData["parentId"] = parent;
    if (menu_order !== undefined) updateData["menuOrder"] = menu_order;

    // Handle slug: if title changed and no explicit slug, re-derive and apply auto-suffix
    let finalSlug: string | undefined;
    if (explicitSlug !== undefined) {
      finalSlug = explicitSlug;
      updateData["slug"] = finalSlug;
    } else if (title !== undefined) {
      // Title is being updated without explicit slug — re-derive
      const baseSlug = deriveSlug(title);
      finalSlug = await findAvailableSlug(baseSlug, async (s: string) => {
        // Only consider OTHER posts of same type (not current post itself)
        const allWithSlug = await db
          .select()
          .from(posts)
          .where(and(eq(posts.slug, s), eq(posts.type, postType)));
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
          message: `${postType} ${id} not found.`,
        });
      }

      // Update term relationships if provided (replaces all existing — idempotent)
      if (categories !== undefined || tags !== undefined) {
        // Delete all existing relationships for this post
        await db
          .delete(termRelationships)
          .where(eq(termRelationships.postId, id));

        // Insert new relationships
        const termIds = [...new Set([...(categories ?? []), ...(tags ?? [])])];
        if (termIds.length > 0) {
          await Promise.all(
            termIds.map((termId) =>
              db
                .insert(termRelationships)
                .values({
                  postId: id,
                  termId,
                  order: 0,
                })
                .catch(() => {
                  // Silently ignore FK constraint violations (non-existent terms)
                }),
            ),
          );
        }
      }

      // Load fresh relationships and return serialized post
      const [loadedCategories, loadedTags] = await loadPostTerms(id);
      return toWpPost(
        updated,
        request.server.hooks,
        "view",
        loadedCategories,
        loadedTags,
      );
    } catch (err: unknown) {
      // Handle explicit slug collision — 409 if caller was explicit
      if (err instanceof Error && err.message.includes("unique")) {
        const statusCode = explicitSlug !== undefined ? 409 : 400;
        const message =
          explicitSlug !== undefined
            ? "Slug already exists (explicit slug collision)."
            : "Slug collision (no available suffix found).";
        return reply.status(statusCode).send({
          code:
            explicitSlug !== undefined ? "SLUG_COLLISION" : "INVALID_REQUEST",
          message,
        });
      }
      throw err;
    }
  }

  /**
   * DELETE /wp/v2/{posts|pages}/:id — Delete a post/page (soft or hard delete).
   * Soft delete: set status to trash. Hard delete: remove from DB.
   * Requires admin authentication.
   */
  async function deletePostOfType(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const params = request.params as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const id = parseInt(params["id"] as string, 10);
    const force = (query["force"] as string) === "true";

    // Fetch the post first to return its pre-deletion state
    const [post] = await db
      .select()
      .from(posts)
      .where(and(eq(posts.id, id), eq(posts.type, postType)));

    if (!post) {
      return reply.status(404).send({
        code: "NOT_FOUND",
        message: `${postType} ${id} not found.`,
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

  return {
    listPosts: listPostsOfType,
    getPost: getPostOfType,
    createPost: createPostOfType,
    updatePost: updatePostOfType,
    deletePost: deletePostOfType,
  };
}
