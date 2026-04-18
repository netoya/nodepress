import { describe, it, expect, vi } from "vitest";
import type { Post } from "@nodepress/db";
import { toWpPost, toWpPostAsync } from "../serialize.js";
import type { BridgeOutput } from "../../../bridge/index.js";

/**
 * Sample post for testing
 */
const createSamplePost = (overrides?: Partial<Post>): Post => ({
  id: 1,
  title: "Test Post",
  content: "[footnote]This is a footnote[/footnote] Main content",
  excerpt: "Test excerpt",
  slug: "test-post",
  status: "publish",
  type: "post",
  authorId: 1,
  parentId: null,
  menuOrder: 0,
  createdAt: new Date("2026-04-18"),
  updatedAt: new Date("2026-04-18"),
  meta: {},
  ...overrides,
});

const noopHooks = {
  applyFilters<T>(_name: string, value: T): T {
    return value;
  },
};

describe("serialize.ts — toWpPost and toWpPostAsync", () => {
  describe("toWpPost (sync version)", () => {
    it("should serialize a post to WP v2 shape", () => {
      const post = createSamplePost();
      const result = toWpPost(post);

      expect(result.id).toBe(1);
      expect(result.title.rendered).toBe("Test Post");
      expect(result.content.rendered).toBe(post.content);
      expect(result.slug).toBe("test-post");
      expect(result.status).toBe("publish");
      expect(result.author).toBe(1);
      expect(result._nodepress.type).toBe("post");
    });

    it("should wrap title/content/excerpt in {rendered, protected}", () => {
      const post = createSamplePost();
      const result = toWpPost(post);

      expect(result.title).toEqual({ rendered: "Test Post", protected: false });
      expect(result.content).toEqual({
        rendered: post.content,
        protected: false,
      });
      expect(result.excerpt).toEqual({
        rendered: "Test excerpt",
        protected: false,
      });
    });

    it("should apply the_content filter if hooks provided", () => {
      const post = createSamplePost();
      const customHooks = {
        applyFilters<T>(
          name: string,
          value: T,

          _context?: any,
        ): T {
          if (name === "the_content" && typeof value === "string") {
            return (value + " [FILTERED]") as T;
          }
          return value;
        },
      };

      const result = toWpPost(post, customHooks);
      expect(result.content.rendered).toBe(
        "[footnote]This is a footnote[/footnote] Main content [FILTERED]",
      );
    });
  });

  describe("toWpPostAsync (async version)", () => {
    it("should serialize a post without bridge (same as sync)", async () => {
      const post = createSamplePost();
      const result = await toWpPostAsync(post, noopHooks);

      expect(result.id).toBe(1);
      expect(result.title.rendered).toBe("Test Post");
      expect(result.content.rendered).toBe(post.content);
      expect(result.slug).toBe("test-post");
    });

    it("should pre-process content through bridge if provided", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn<
          [{ postContent: string; context: any }],
          Promise<BridgeOutput>
        >(async () => ({
          html: "Rendered: Main content",
          warnings: [],
          error: null,
        })),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge);

      expect(mockBridge.renderShortcodes).toHaveBeenCalledWith({
        postContent: post.content,
        context: {
          postId: 1,
          postType: "post",
          postStatus: "publish",
        },
      });
      expect(result.content.rendered).toBe("Rendered: Main content");
    });

    it("should pass bridge output to the_content filter", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn<
          [{ postContent: string; context: any }],
          Promise<BridgeOutput>
        >(async () => ({
          html: "<p>Bridge output</p>",
          warnings: [],
          error: null,
        })),
      };

      const customHooks = {
        applyFilters<T>(
          name: string,
          value: T,

          _context?: any,
        ): T {
          if (name === "the_content" && typeof value === "string") {
            return (value + " [SYNC_FILTERED]") as T;
          }
          return value;
        },
      };

      const result = await toWpPostAsync(post, customHooks, mockBridge);

      expect(result.content.rendered).toBe(
        "<p>Bridge output</p> [SYNC_FILTERED]",
      );
    });

    it("should use original content if bridge returns error", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn<
          [{ postContent: string; context: any }],
          Promise<BridgeOutput>
        >(async () => ({
          html: "", // html is ignored when error is set
          warnings: ["timeout"],
          error: "BRIDGE_TIMEOUT",
        })),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge);

      // Should use original content (passthrough)
      expect(result.content.rendered).toBe(post.content);
    });

    it("should handle bridge exception gracefully (passthrough)", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn<
          [{ postContent: string; context: any }],
          Promise<BridgeOutput>
        >(async () => {
          throw new Error("Bridge crashed");
        }),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge);

      // Should use original content on any exception
      expect(result.content.rendered).toBe(post.content);
    });

    it("should include _nodepress fields", async () => {
      const post = createSamplePost({ parentId: 5, menuOrder: 10 });
      const result = await toWpPostAsync(post, noopHooks);

      expect(result._nodepress).toEqual({
        type: "post",
        parent_id: 5,
        menu_order: 10,
        meta: {},
      });
    });
  });
});
