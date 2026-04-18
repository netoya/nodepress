/**
 * Normalization layer: WXR records → NodePress DB rows.
 */

import { WxrPost, WxrTerm, WxrUser, WxrComment } from "./wxr-types.js";
import type { NewPost, NewTerm, NewUser, NewComment } from "@nodepress/db";

/**
 * Normalize a WXR post to a NodePress post row.
 * Note: authorId is resolved later when we know user mappings.
 */
export function normalizeWxrPost(wxr: WxrPost): Omit<NewPost, "authorId"> & {
  authorId: number;
} {
  return {
    type: wxr.type === "page" ? "page" : "post",
    status: wxr.status,
    title: wxr.title || "Untitled",
    slug: wxr.slug || generateSlug(wxr.title),
    content: wxr.content || "",
    excerpt: wxr.excerpt || "",
    authorId: 1, // Placeholder; caller must resolve from user map
    parentId: undefined,
    menuOrder: 0,
    meta: {
      wp_post_id: wxr.wpPostId,
      wp_author_login: wxr.authorLogin,
    } as any,
    createdAt: wxr.pubDate || new Date(),
    updatedAt: wxr.pubDate || new Date(),
  };
}

/**
 * Normalize a WXR term to a NodePress term row.
 */
export function normalizeWxrTerm(wxr: WxrTerm): NewTerm {
  return {
    taxonomy: wxr.taxonomy === "post_tag" ? "post_tag" : "category",
    name: wxr.name,
    slug: wxr.slug,
    description: wxr.description || "",
    parentId: wxr.parentId,
    meta: {
      wp_term_id: wxr.wpTermId,
    } as any,
  };
}

/**
 * Normalize a WXR user to a NodePress user row.
 * Password is not imported (phpass incompatibility).
 * Users are created with a dummy hash; they must reset on first login.
 */
export function normalizeWxrUser(wxr: WxrUser): NewUser {
  return {
    login: wxr.login,
    email: wxr.email,
    displayName: wxr.displayName || wxr.login,
    passwordHash: "!", // Marker for "password reset required"
    roles: ["subscriber"],
    capabilities: {},
    meta: {
      wp_user_id: wxr.wpUserId,
      wp_imported: true,
      wp_import_date: new Date().toISOString(),
    } as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Normalize a WXR comment to a NodePress comment row.
 * Note: authorId is resolved later when we know user mappings.
 */
export function normalizeWxrComment(
  wxr: WxrComment,
  postId: number,
): Omit<NewComment, "authorId"> & { authorId: number | null } {
  return {
    postId,
    authorId: null, // Placeholder; caller resolves if user exists
    parentId: undefined,
    content: wxr.content,
    status: wxr.status === "approved" ? "approved" : "pending",
    type: "comment",
    meta: {
      wp_comment_id: wxr.wpCommentId,
      wp_author_name: wxr.authorName,
      wp_author_email: wxr.authorEmail,
    } as any,
    createdAt: wxr.pubDate || new Date(),
  };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 200);
}
