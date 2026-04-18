/**
 * Batch writer: buffers normalized rows and flushes to DB.
 */

import { db, posts, terms, users, comments } from "@nodepress/db";
import type { NewPost, NewTerm, NewUser, NewComment } from "@nodepress/db";
import { sql } from "drizzle-orm";

const BATCH_SIZE = 500;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMeta = any;

interface BufferedPost extends NewPost {
  meta: AnyMeta;
}

interface BufferedTerm extends NewTerm {
  meta: AnyMeta;
}

interface BufferedUser extends NewUser {
  meta: AnyMeta;
}

interface BufferedComment extends NewComment {
  meta: AnyMeta;
}

interface BatchState {
  posts: BufferedPost[];
  terms: BufferedTerm[];
  users: BufferedUser[];
  comments: BufferedComment[];
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

  addPost(post: BufferedPost): void {
    this.state.posts.push(post);
  }

  addTerm(term: BufferedTerm): void {
    this.state.terms.push(term);
  }

  addUser(user: BufferedUser): void {
    this.state.users.push(user);
  }

  addComment(comment: BufferedComment): void {
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
    if (this.dryRun) return;
    await this.flushUsers();
    await this.flushPosts();
    await this.flushTerms();
    await this.flushComments();
  }

  private async flushUsers(): Promise<void> {
    if (this.state.users.length === 0) return;
    const userRows = this.state.users.splice(0, BATCH_SIZE);
    for (const user of userRows) {
      try {
        const existing = await db
          .select({ id: users.id })
          .from(users)
          .where(sql`email = ${user.email}`)
          .limit(1);
        if (existing.length > 0) {
          this.stats.usersSkipped++;
        } else {
          const result = await db
            .insert(users)
            .values(user)
            .returning({ id: users.id });
          if (result.length > 0) {
            this.stats.usersInserted++;
            const wpUserId = user.meta?.wp_user_id;
            if (typeof wpUserId === "number")
              this.recordUserMapping(wpUserId, result[0]!.id);
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert user ${user.email}:`, err);
      }
    }
    if (this.state.users.length > 0) await this.flushUsers();
  }

  private async flushPosts(): Promise<void> {
    if (this.state.posts.length === 0) return;
    const postRows = this.state.posts.splice(0, BATCH_SIZE);
    for (const post of postRows) {
      try {
        const wpAuthorLogin = post.meta?.wp_author_login;
        if (typeof wpAuthorLogin === "string") {
          const author = await db
            .select({ id: users.id })
            .from(users)
            .where(sql`login = ${wpAuthorLogin}`)
            .limit(1);
          if (author.length > 0) {
            post.authorId = author[0]!.id;
          } else {
            const firstUser = await db
              .select({ id: users.id })
              .from(users)
              .limit(1);

            post.authorId = firstUser.length > 0 ? firstUser[0]!.id : 1;
          }
        }
        const wpPostId = post.meta?.wp_post_id;
        const existing =
          typeof wpPostId === "number"
            ? await db
                .select({ id: posts.id })
                .from(posts)
                .where(sql`meta->>'wp_post_id' = ${String(wpPostId)}`)
                .limit(1)
            : [];
        if (existing.length > 0) {
          const result = await db
            .update(posts)
            .set({ ...post, updatedAt: new Date() })
            .where(sql`id = ${existing[0]!.id}`)
            .returning({ id: posts.id });
          if (result.length > 0) {
            this.stats.postsInserted++;
            if (typeof wpPostId === "number")
              this.recordPostMapping(wpPostId, result[0]!.id);
          }
        } else {
          const result = await db
            .insert(posts)
            .values(post)
            .returning({ id: posts.id });
          if (result.length > 0) {
            this.stats.postsInserted++;
            if (typeof wpPostId === "number")
              this.recordPostMapping(wpPostId, result[0]!.id);
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert post ${post.slug}:`, err);
      }
    }
    if (this.state.posts.length > 0) await this.flushPosts();
  }

  private async flushTerms(): Promise<void> {
    if (this.state.terms.length === 0) return;
    const termRows = this.state.terms.splice(0, BATCH_SIZE);
    for (const term of termRows) {
      try {
        const wpTermId = term.meta?.wp_term_id;
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
          const result = await db
            .update(terms)
            .set(term)
            .where(sql`id = ${existing[0]!.id}`)
            .returning({ id: terms.id });
          if (result.length > 0) {
            this.stats.termsInserted++;
            if (typeof wpTermId === "number")
              this.recordTermMapping(wpTermId, result[0]!.id);
          }
        } else {
          const result = await db
            .insert(terms)
            .values(term)
            .returning({ id: terms.id });
          if (result.length > 0) {
            this.stats.termsInserted++;
            if (typeof wpTermId === "number")
              this.recordTermMapping(wpTermId, result[0]!.id);
          }
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert term ${term.name}:`, err);
      }
    }
    if (this.state.terms.length > 0) await this.flushTerms();
  }

  private async flushComments(): Promise<void> {
    if (this.state.comments.length === 0) return;
    const commentRows = this.state.comments.splice(0, BATCH_SIZE);
    for (const comment of commentRows) {
      try {
        const wpPostId = comment.meta?.wp_comment_post_id;
        if (
          typeof wpPostId === "number" &&
          this.state.postMappings.has(wpPostId)
        ) {
          const mapped = this.state.postMappings.get(wpPostId);
          if (mapped) comment.postId = mapped;
        }
        const wpCommentId = comment.meta?.wp_comment_id;
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
          const result = await db
            .insert(comments)
            .values(comment)
            .returning({ id: comments.id });
          if (result.length > 0) this.stats.commentsInserted++;
        }
      } catch (err) {
        console.error(`[WARN] Failed to insert comment:`, err);
      }
    }
    if (this.state.comments.length > 0) await this.flushComments();
  }

  getStats(): ImportStats {
    return this.stats;
  }
}
