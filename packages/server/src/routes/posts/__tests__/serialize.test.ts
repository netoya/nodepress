import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Post } from "@nodepress/db";
import { toWpPost, toWpPostAsync } from "../serialize.js";

// Mock @nodepress/db to avoid DB access in tests
vi.mock("@nodepress/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => []),
        })),
      })),
    })),
  },
  termRelationships: {},
  terms: {},
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    it("should omit raw fields when context=view (default)", () => {
      const post = createSamplePost();
      const result = toWpPost(post, noopHooks, "view");

      expect(result.title).not.toHaveProperty("raw");
      expect(result.content).not.toHaveProperty("raw");
      expect(result.excerpt).not.toHaveProperty("raw");
    });

    it("should include raw fields when context=edit", () => {
      const post = createSamplePost();
      const result = toWpPost(post, noopHooks, "edit");

      expect((result.title as any).raw).toBe("Test Post");
      expect((result.content as any).raw).toBe(post.content);
      expect((result.excerpt as any).raw).toBe("Test excerpt");
    });

    it("raw in context=edit reflects unrendered source, not filtered content", () => {
      const post = createSamplePost();

      const customHooks = {
        applyFilters<T>(name: string, value: T): T {
          if (name === "the_content" && typeof value === "string") {
            return (value + " [FILTERED]") as T;
          }
          return value;
        },
      };

      const result = toWpPost(post, customHooks, "edit");

      // raw should be unfiltered original
      expect((result.content as any).raw).toBe(post.content);
      // rendered should be filtered
      expect(result.content.rendered).toBe(post.content + " [FILTERED]");
    });

    it("should apply the_content filter to rendered content", () => {
      const post = createSamplePost();

      const customHooks = {
        applyFilters<T>(name: string, value: T): T {
          if (name === "the_content" && typeof value === "string") {
            return (value + " [SYNC_FILTERED]") as T;
          }
          return value;
        },
      };

      const result = toWpPost(post, customHooks);

      expect(result.content.rendered).toBe(post.content + " [SYNC_FILTERED]");
    });

    it("should support category and tag arrays", () => {
      const post = createSamplePost();
      const result = toWpPost(post, noopHooks, "view", [1, 2], [3, 4]);

      expect(result.categories).toEqual([1, 2]);
      expect(result.tags).toEqual([3, 4]);
    });

    it("should default categories and tags to empty arrays", () => {
      const post = createSamplePost();
      const result = toWpPost(post);

      expect(result.categories).toEqual([]);
      expect(result.tags).toEqual([]);
    });
  });

  describe("toWpPostAsync (async version)", () => {
    it("should return same shape as toWpPost without bridge", async () => {
      const post = createSamplePost();
      const result = await toWpPostAsync(post, noopHooks);

      expect(result.id).toBe(1);
      expect(result.title.rendered).toBe("Test Post");
      expect(result.slug).toBe("test-post");
      expect(result.status).toBe("publish");
      expect(result.author).toBe(1);
    });

    it("should pre-process content through bridge if provided", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn(async () => ({
          html: "Rendered: Main content",
          warnings: [],
          error: null,
        })),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge as any);

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
        renderShortcodes: vi.fn(async () => ({
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

      const result = await toWpPostAsync(post, customHooks, mockBridge as any);

      expect(result.content.rendered).toBe(
        "<p>Bridge output</p> [SYNC_FILTERED]",
      );
    });

    it("should use original content if bridge returns error", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn(async () => ({
          html: "", // html is ignored when error is set
          warnings: ["timeout"],
          error: "BRIDGE_TIMEOUT",
        })),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge as any);

      // Should use original content (passthrough)
      expect(result.content.rendered).toBe(post.content);
    });

    it("should handle bridge exception gracefully (passthrough)", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn(async () => {
          throw new Error("Bridge crashed");
        }),
      };

      const result = await toWpPostAsync(post, noopHooks, mockBridge as any);

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

    it("should include raw fields when context=edit (async)", async () => {
      const post = createSamplePost();
      const result = await toWpPostAsync(post, noopHooks, undefined, "edit");

      expect((result.title as any).raw).toBe("Test Post");
      expect((result.content as any).raw).toBe(post.content);
      expect((result.excerpt as any).raw).toBe("Test excerpt");
    });

    it("raw in context=edit reflects bridge input, not bridge output", async () => {
      const post = createSamplePost();
      const mockBridge = {
        renderShortcodes: vi.fn(async () => ({
          html: "Bridge says this",
          warnings: [],
          error: null,
        })),
      };

      const result = await toWpPostAsync(
        post,
        noopHooks,
        mockBridge as any,
        "edit",
      );

      // raw should be original unrendered content (not bridge output)
      expect((result.content as any).raw).toBe(post.content);
      // rendered should be bridge output
      expect(result.content.rendered).toBe("Bridge says this");
    });

    it("should include empty categories and tags from DB mock", async () => {
      const post = createSamplePost();
      const result = await toWpPostAsync(post, noopHooks);

      expect(result.categories).toEqual([]);
      expect(result.tags).toEqual([]);
    });
  });
});
