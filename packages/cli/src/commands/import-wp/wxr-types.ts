/**
 * WXR (WordPress eXtended RSS) type definitions for parsed elements.
 */

export interface WxrPost {
  wpPostId: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: "publish" | "draft" | "private" | "trash" | "pending";
  type: "post" | "page" | "attachment" | "custom";
  authorLogin?: string;
  pubDate?: Date;
}

export interface WxrTerm {
  wpTermId: number;
  name: string;
  slug: string;
  taxonomy: "category" | "post_tag" | "other";
  parentId?: number;
  description?: string;
}

export interface WxrUser {
  wpUserId: number;
  login: string;
  email: string;
  displayName: string;
}

export interface WxrComment {
  wpCommentId: number;
  postWpId: number;
  authorName: string;
  authorEmail?: string;
  content: string;
  status: "approved" | "moderated" | "spam" | "trash";
  parentWpId?: number;
  pubDate?: Date;
}

export interface WxrParseResult {
  posts: WxrPost[];
  terms: WxrTerm[];
  users: WxrUser[];
  comments: WxrComment[];
  skipped: {
    attachments: number;
    customPostTypes: Set<string>;
    meta: Map<string, number>;
    serializedPhp: number;
    themeSettings: number;
  };
}
