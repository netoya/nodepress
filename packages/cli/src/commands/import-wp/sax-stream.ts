/**
 * SAX streaming parser for WXR XML.
 * Emits typed WXR records as they complete.
 */

import sax from "sax";
import { createReadStream } from "fs";
import type { WxrPost, WxrTerm, WxrUser, WxrComment } from "./wxr-types.js";

interface ParserState {
  inItem: boolean;
  inCategory: boolean;
  inTag: boolean;
  inAuthor: boolean;
  inComment: boolean;
  currentElement: string;
  elementStack: string[];
  charBuffer: string;
  currentPost?: Partial<WxrPost>;
  currentTerm?: Partial<WxrTerm>;
  currentUser?: Partial<WxrUser>;
  currentComment?: Partial<WxrComment>;
}

interface ParseHandlers {
  onPost: (post: WxrPost) => void;
  onTerm: (term: WxrTerm) => void;
  onUser: (user: WxrUser) => void;
  onComment: (comment: WxrComment) => void;
  onSkipAttachment: () => void;
  onSkipCustomType: (type: string) => void;
  onSkipMeta: (key: string) => void;
  onError: (err: Error) => void;
}

export function parseWxrStream(
  filePath: string,
  handlers: ParseHandlers,
  onComplete: () => void,
): void {
  const state: ParserState = {
    inItem: false,
    inCategory: false,
    inTag: false,
    inAuthor: false,
    inComment: false,
    currentElement: "",
    elementStack: [],
    charBuffer: "",
  };

  const parser = sax.createStream(true, { trim: true });

  parser.on("opentag", (node: sax.QualifiedTag) => {
    state.elementStack.push(node.name);
    state.currentElement = node.name;
    state.charBuffer = "";

    // Track when we enter container elements
    if (node.name === "item") {
      state.inItem = true;
      state.currentPost = {};
    }

    // Categories, tags, authors
    if (
      node.name === "category" &&
      (node.attributes as Record<string, unknown>)["domain"] === "category"
    ) {
      state.inCategory = true;
      state.currentTerm = {
        taxonomy: "category" as const,
        wpTermId: 0,
        name: "",
        slug: "",
      };
    }

    if (
      node.name === "tag" &&
      (node.attributes as Record<string, unknown>)["domain"] === "post_tag"
    ) {
      state.inTag = true;
      state.currentTerm = {
        taxonomy: "post_tag" as const,
        wpTermId: 0,
        name: "",
        slug: "",
      };
    }

    if (
      node.name === "author" &&
      state.elementStack[state.elementStack.length - 2] === "rss"
    ) {
      state.inAuthor = true;
      state.currentUser = {};
    }

    if (node.name === "comment" && state.inItem) {
      state.inComment = true;
      state.currentComment = {};
    }
  });

  parser.on("text", (text: string) => {
    if (text.trim()) {
      state.charBuffer += text;
    }
  });

  parser.on("closetag", (name: string) => {
    const trimmedText = state.charBuffer.trim();
    state.elementStack.pop();
    state.currentElement =
      state.elementStack[state.elementStack.length - 1] || "";

    // Posts
    if (state.inItem && !state.inCategory && !state.inTag && !state.inComment) {
      if (name === "post_id" && state.currentPost) {
        state.currentPost.wpPostId = parseInt(trimmedText, 10) || 0;
      } else if (name === "title" && state.currentPost) {
        state.currentPost.title = trimmedText;
      } else if (name === "post_name" && state.currentPost) {
        state.currentPost.slug = trimmedText;
      } else if (name === "content:encoded" && state.currentPost) {
        state.currentPost.content = trimmedText;
      } else if (name === "excerpt:encoded" && state.currentPost) {
        state.currentPost.excerpt = trimmedText;
      } else if (name === "wp:post_type" && state.currentPost) {
        const pt = trimmedText as "post" | "page" | "attachment" | "custom";
        if (pt === "post" || pt === "page") {
          state.currentPost.type = pt;
        } else if (pt === "attachment") {
          state.currentPost.type = "attachment";
        } else {
          state.currentPost.type = "custom";
        }
      } else if (name === "wp:status" && state.currentPost) {
        const st = trimmedText as
          | "publish"
          | "draft"
          | "private"
          | "trash"
          | "pending";
        if (
          st === "publish" ||
          st === "draft" ||
          st === "private" ||
          st === "trash" ||
          st === "pending"
        ) {
          state.currentPost.status = st;
        }
      } else if (name === "pubDate" && state.currentPost) {
        state.currentPost.pubDate = new Date(trimmedText);
      } else if (name === "dc:creator" && state.currentPost) {
        state.currentPost.authorLogin = trimmedText;
      }
    }

    // Categories (imported as terms)
    if (state.inCategory && state.currentTerm) {
      if (name === "cat_name") {
        state.currentTerm.name = trimmedText;
      } else if (name === "category_nicename") {
        state.currentTerm.slug = trimmedText;
      } else if (name === "wp:term_id") {
        state.currentTerm.wpTermId = parseInt(trimmedText, 10) || 0;
      } else if (name === "wp:category_parent") {
        const parentId = parseInt(trimmedText, 10);
        if (parentId > 0) {
          state.currentTerm.parentId = parentId;
        }
      } else if (name === "description") {
        state.currentTerm.description = trimmedText;
      } else if (name === "category") {
        state.inCategory = false;
        if (
          state.currentTerm.wpTermId &&
          state.currentTerm.name &&
          state.currentTerm.slug
        ) {
          handlers.onTerm(state.currentTerm as WxrTerm);
        }
        state.currentTerm = undefined;
      }
    }

    // Tags (imported as terms)
    if (state.inTag && state.currentTerm) {
      if (name === "tag_name") {
        state.currentTerm.name = trimmedText;
      } else if (name === "tag_slug") {
        state.currentTerm.slug = trimmedText;
      } else if (name === "wp:term_id") {
        state.currentTerm.wpTermId = parseInt(trimmedText, 10) || 0;
      } else if (name === "description") {
        state.currentTerm.description = trimmedText;
      } else if (name === "tag") {
        state.inTag = false;
        if (
          state.currentTerm.wpTermId &&
          state.currentTerm.name &&
          state.currentTerm.slug
        ) {
          handlers.onTerm(state.currentTerm as WxrTerm);
        }
        state.currentTerm = undefined;
      }
    }

    // Authors (imported as users)
    if (state.inAuthor && state.currentUser) {
      if (name === "wp:author_id") {
        state.currentUser.wpUserId = parseInt(trimmedText, 10) || 0;
      } else if (name === "wp:author_login") {
        state.currentUser.login = trimmedText;
      } else if (name === "wp:author_email") {
        state.currentUser.email = trimmedText;
      } else if (name === "wp:author_display_name") {
        state.currentUser.displayName = trimmedText;
      } else if (name === "author") {
        state.inAuthor = false;
        if (
          state.currentUser.wpUserId &&
          state.currentUser.login &&
          state.currentUser.email
        ) {
          handlers.onUser(state.currentUser as WxrUser);
        }
        state.currentUser = undefined;
      }
    }

    // Comments
    if (state.inComment && state.currentComment) {
      if (name === "wp:comment_id") {
        state.currentComment.wpCommentId = parseInt(trimmedText, 10) || 0;
      } else if (name === "wp:comment_post_id") {
        state.currentComment.postWpId = parseInt(trimmedText, 10) || 0;
      } else if (name === "wp:comment_author") {
        state.currentComment.authorName = trimmedText;
      } else if (name === "wp:comment_author_email") {
        state.currentComment.authorEmail = trimmedText;
      } else if (name === "wp:comment_content") {
        state.currentComment.content = trimmedText;
      } else if (name === "wp:comment_approved") {
        const status = trimmedText.toLowerCase();
        state.currentComment.status =
          (status as "approved" | "moderated" | "spam" | "trash") ||
          "moderated";
      } else if (name === "wp:comment_parent") {
        const parentId = parseInt(trimmedText, 10);
        if (parentId > 0) {
          state.currentComment.parentWpId = parentId;
        }
      } else if (name === "comment") {
        state.inComment = false;
        if (
          state.currentComment.wpCommentId &&
          state.currentComment.postWpId &&
          state.currentComment.authorName &&
          state.currentComment.content
        ) {
          handlers.onComment(state.currentComment as WxrComment);
        }
        state.currentComment = undefined;
      }
    }

    // Post closing
    if (state.inItem && name === "item" && state.currentPost) {
      state.inItem = false;

      // Check post type
      const type = state.currentPost.type || "post";
      if (type === "attachment") {
        handlers.onSkipAttachment();
      } else if (
        type === "custom" ||
        (typeof type === "string" &&
          type !== "post" &&
          type !== "page" &&
          type !== "attachment")
      ) {
        handlers.onSkipCustomType(type);
      } else if (state.currentPost.wpPostId && state.currentPost.title) {
        // Only emit if valid
        handlers.onPost(state.currentPost as WxrPost);
      }

      state.currentPost = undefined;
    }

    state.charBuffer = "";
  });

  parser.on("error", (err: Error) => {
    handlers.onError(new Error(`SAX parse error: ${err.message}`));
  });

  const stream = createReadStream(filePath);
  stream.pipe(parser);

  stream.on("end", () => {
    parser.end();
    onComplete();
  });

  stream.on("error", (err: Error) => {
    handlers.onError(err);
  });

  parser.on("end", () => {
    // Final completion already called by stream.on("end")
  });
}
