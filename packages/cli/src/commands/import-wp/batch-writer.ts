/**
 * Batch writer: buffers normalized rows and flushes to DB.
 * Handles idempotency via metadata fields.
 */

import { db, posts, terms, users, comments } from "@nodepress/db";
import type { NewPost, NewTerm, NewUser, NewComment } from "@nodepress/db";
import { sql } from "drizzle-orm";

const BATCH_SIZE = 500;

interface BatchState {
  posts: (NewPost & { meta: Record<string, unknown> })[];
  terms: (NewTerm & { meta: Record<string, unknown> })[];
  users: (NewUser & { meta: Record<string, unknown> })[];
  comments: (NewComment & { meta: Record<string, unknown> })[];
  termMappings: Map<number, number>;
  userMappings: Map<number, number>;
  postMappings: Map<number, number>;
}

export interface ImportStats {
  postsInserted: number;
  postsSkipped: number;
  termsInserted: number;
  termsSkipped: number;
  usersInserted: number;
  usersSkipped: number;
  commentsInserted: number;
  commentsSkipped: number;
}

export class BatchWriter {
  private state: BatchState;
  private stats: ImportStats;
  private dryRun: boolean;

  constructor(dryRun: boolean = false) {
    this.dryRun = dryRun;
    this.state = {
      posts: [],
      terms: [],
      users: [],
      comments: [],
      termMappings: new Map(),
      userMappings: new Map(),
      postMappings: new Map(),
    };
    this.stats = {
      postsInserted: 0,
      postsSkipped: 0,
      termsInserted: 0,
      termsSkipped: 0,
      usersInserted: 0,
      usersSkipped: 0,
      commentsInserted: 0,
      commentsSkipped: 0,
    };
  }

  addPost(post: NewPost & { meta: Record<string, unknown> }): void {
    this.state.posts.push(post);
  }

  addTerm(term: NewTerm & { meta: Record<string, unknown> }): void {
    this.state.terms.push(term);
  }

  addUser(user: NewUser & { meta: Record<string, unknown> }): void {
    this.state.users.push(user);
  }

  addComment(comment: NewComment & { meta: Record<string, unknown> }): void {
    this.state.comments.push(comment);
  }

  recordTermMapping(wpTermId: number, localId: number): void {
    this.state.termMappings.set(wpTermId, localId);
  }

  recordUserMapping(wpUserId: number, localId: number): void {
    this.state.userMappings.set(wpUserId, localId);
  }

  recordPostMapping(wpPostId: number, localId: number): void {
    this.state.postMappings.set(wpPostId, localId);
  }

  async flush(): Promise<void> {
    if (this.dryRun) {
      return; // No-op in dry-run
    }

    // Flush users first (posts reference them)
    await this.flushUsers();

    // Flush posts (need user IDs)
    await this.flushPosts();

    // Flush terms
    await this.flushTerms();

    // Flush comments (need post IDs, optional user IDs)
    await this.flushComments();
  }

  private async flushUsers(): Promise<void> {
    if (this.state.users.length === 0) return;

    const userRows = this.state.users.splice(0, BATCH_SIZE);
    for (const user of userRows) {
      try {
        // Check if user exists by email
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`email = ${user.email}`)
          .limit(1);

        if (existing.length > 0) {
          this.stats.usersSkipped++;
          // Don't update existing users (security — imported users don't overwrite)
        } else {
          const inserted = await db
            .insert(users)
            .values(user)
            .returning({ id: users.id });
          if (inserted.length > 0) {
            this.stats.usersInserted++;
            const wpUserId = (user.meta as Record<string, unknown>)?.wp_user_id;
            if (typeof wpUserId === "number") {
              this.recordUserMapping(wpUserId, inserted[0].id);
            }
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert user ${user.email}:`, err);
      }
    }

    // Recursive flush if more batches
    if (this.state.users.length > 0) {
      await this.flushUsers();
    }
  }

  private async flushPosts(): Promise<void> {
    if (this.state.posts.length === 0) return;

    const postRows = this.state.posts.splice(0, BATCH_SIZE);
    for (const post of postRows) {
      try {
        // Resolve authorId from mapping
        const wpAuthorLogin = (post.meta as Record<string, unknown>)
          ?.wp_author_login;
        if (typeof wpAuthorLogin === "string") {
          // Find user by login
          const author = await db
            .select({ id: users.id })
            .from(users)
            .where(sql`login = ${wpAuthorLogin}`)
            .limit(1);
          if (author.length > 0) {
            post.authorId = author[0].id;
          } else {
            // Fallback to first user
            const firstUser = await db
              .select({ id: users.id })
              .from(users)
              .limit(1);
            post.authorId = firstUser.length > 0 ? firstUser[0].id : 1;
          }
        }

        const wpPostId = (post.meta as Record<string, unknown>)?.wp_post_id;
        const existing =
          typeof wpPostId === "number"
            ? await db
                .select({ id: posts.id })
                .from(posts)
                .where(sql`meta->>'wp_post_id' = ${String(wpPostId)}`)
                .limit(1)
            : [];

        if (existing.length > 0) {
          // Update existing post
          const updated = await db
            .update(posts)
            .set({
              ...post,
              updatedAt: new Date(),
            })
            .where(sql`id = ${existing[0].id}`)
            .returning({ id: posts.id });
          if (updated.length > 0) {
            this.stats.postsInserted++;
            if (typeof wpPostId === "number") {
              this.recordPostMapping(wpPostId, updated[0].id);
            }
          }
        } else {
          // Insert new post
          const inserted = await db
            .insert(posts)
            .values(post)
            .returning({ id: posts.id });
          if (inserted.length > 0) {
            this.stats.postsInserted++;
            if (typeof wpPostId === "number") {
              this.recordPostMapping(wpPostId, inserted[0].id);
            }
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert post ${post.slug}:`, err);
      }
    }

    if (this.state.posts.length > 0) {
      await this.flushPosts();
    }
  }

  private async flushTerms(): Promise<void> {
    if (this.state.terms.length === 0) return;

    const termRows = this.state.terms.splice(0, BATCH_SIZE);
    for (const term of termRows) {
      try {
        const wpTermId = (term.meta as Record<string, unknown>)?.wp_term_id;
        const existing =
          typeof wpTermId === "number"
            ? await db
                .select({ id: terms.id })
                .from(terms)
                .where(
                  sql`taxonomy = ${term.taxonomy} AND meta->>'wp_term_id' = ${String(wpTermId)}`,
                )
                .limit(1)
            : [];

        if (existing.length > 0) {
          // Update
          const updated = await db
            .update(terms)
            .set(term)
            .where(sql`id = ${existing[0].id}`)
            .returning({ id: terms.id });
          if (updated.length > 0) {
            this.stats.termsInserted++;
            if (typeof wpTermId === "number") {
              this.recordTermMapping(wpTermId, updated[0].id);
            }
          }
        } else {
          // Insert
          const inserted = await db
            .insert(terms)
            .values(term)
            .returning({ id: terms.id });
          if (inserted.length > 0) {
            this.stats.termsInserted++;
            if (typeof wpTermId === "number") {
              this.recordTermMapping(wpTermId, inserted[0].id);
            }
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert term ${term.name}:`, err);
      }
    }

    if (this.state.terms.length > 0) {
      await this.flushTerms();
    }
  }

  private async flushComments(): Promise<void> {
    if (this.state.comments.length === 0) return;

    const commentRows = this.state.comments.splice(0, BATCH_SIZE);
    for (const comment of commentRows) {
      try {
        // Resolve postId from mapping
        const wpPostId = (comment.meta as Record<string, unknown>)
          ?.wp_comment_post_id;
        if (
          typeof wpPostId === "number" &&
          this.state.postMappings.has(wpPostId)
        ) {
          comment.postId = this.state.postMappings.get(wpPostId)!;
        }

        const wpCommentId = (comment.meta as Record<string, unknown>)
          ?.wp_comment_id;
        const existing =
          typeof wpCommentId === "number"
            ? await db
                .select({ id: comments.id })
                .from(comments)
                .where(sql`meta->>'wp_comment_id' = ${String(wpCommentId)}`)
                .limit(1)
            : [];

        if (existing.length > 0) {
          this.stats.commentsSkipped++;
        } else {
          const inserted = await db
            .insert(comments)
            .values(comment)
            .returning({ id: comments.id });
          if (inserted.length > 0) {
            this.stats.commentsInserted++;
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert comment:`, err);
      }
    }

    if (this.state.comments.length > 0) {
      await this.flushComments();
    }
  }

  getStats(): ImportStats {
    return this.stats;
  }
}
