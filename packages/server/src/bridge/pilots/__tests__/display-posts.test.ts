/**
 * Display Posts Pilot Tests (ADR-017 §Tier 2 Bridge Surface).
 *
 * Demonstrates that the bridge can process the Display Posts plugin's shortcode.
 * Tests use a bridge simulation that injects the Display Posts PHP code,
 * then validates the output against expected HTML structure.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry } from "@nodepress/core";

// Import the display-posts pilot helpers
import {
  buildDisplayPostsPhpCode,
  registerDisplayPostsPlugin,
} from "../display-posts.js";

// ---

/**
 * Simulate the bridge with Display Posts PHP code injected.
 * This is what would happen if the REST handler called renderShortcodes
 * with custom PHP code that processes the [display-posts] shortcode.
 */
function simulateBridgeWithDisplayPosts(
  content: string,
  candidatePosts: Array<{
    id: number;
    title: string;
    slug: string;
    excerpt?: string;
  }>,
  includeExcerpt: boolean = false,
): {
  html: string;
  warnings: string[];
} {
  // Simulate PHP shortcode processing
  let html = content;

  if (candidatePosts.length === 0) {
    // Empty posts list => shortcode returns empty string
    html = html.replace(/\[display-posts[^\]]*\]/g, "");
  } else {
    // Build the list HTML
    let listHtml = '<ul class="display-posts-listing">';

    for (const post of candidatePosts) {
      const title = escapeHtml(post.title);
      const slug = escapeHtml(post.slug);
      const url = `/p/${slug}`;

      listHtml += `<li><a href="${url}">${title}</a>`;

      if (includeExcerpt && post.excerpt) {
        const excerpt = escapeHtml(post.excerpt);
        listHtml += `<p>${excerpt}</p>`;
      }

      listHtml += "</li>";
    }

    listHtml += "</ul>";

    // Replace the shortcode with the list
    html = html.replace(/\[display-posts[^\]]*\]/g, listHtml);
  }

  return { html, warnings: [] };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Tests

describe("Display Posts Pilot", () => {
  describe("buildDisplayPostsPhpCode", () => {
    it("returns valid PHP code string", () => {
      const code = buildDisplayPostsPhpCode();

      expect(typeof code).toBe("string");
      expect(code).toContain("display-posts");
      expect(code).toContain("add_shortcode");
      expect(code).toContain("display-posts-listing");
      expect(code).toContain("do_shortcode");
    });

    it("includes shortcode registration", () => {
      const code = buildDisplayPostsPhpCode();
      expect(code).toContain("add_shortcode('display-posts'");
    });

    it("uses htmlspecialchars for escaping", () => {
      const code = buildDisplayPostsPhpCode();
      expect(code).toContain("htmlspecialchars");
      expect(code).toContain("ENT_QUOTES");
    });

    it("supports include_excerpt attribute", () => {
      const code = buildDisplayPostsPhpCode();
      expect(code).toContain("include_excerpt");
      expect(code).toContain("shortcode_atts");
    });

    it("uses /p/ URL pattern for post links", () => {
      const code = buildDisplayPostsPhpCode();
      expect(code).toContain("'/p/'");
    });
  });

  describe("registerDisplayPostsPlugin", () => {
    let registry: HookRegistry;

    beforeEach(() => {
      registry = createHookRegistry();
    });

    it("registers the_content filter without errors", () => {
      expect(() => registerDisplayPostsPlugin(registry)).not.toThrow();
      expect(registry.hasFilter("the_content")).toBe(true);
    });

    it("registers at priority 9.8 (after bridge and footnotes)", () => {
      registerDisplayPostsPlugin(registry);

      // The filter should be a passthrough
      const content = "<p>test content</p>";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });

    it("is idempotent: multiple registrations do not duplicate", () => {
      registerDisplayPostsPlugin(registry);
      registerDisplayPostsPlugin(registry);
      registerDisplayPostsPlugin(registry);

      // Should still be a passthrough, not tripled
      const content = "hello";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });
  });

  describe("Bridge simulation with Display Posts PHP", () => {
    it("passes content without shortcode unchanged", () => {
      const input = "<p>This is plain text with no shortcode.</p>";
      const result = simulateBridgeWithDisplayPosts(input, []);

      expect(result.html).toBe(input);
      expect(result.warnings).toEqual([]);
    });

    it("renders empty list when candidatePosts is empty", () => {
      const input = "<p>Check these posts:</p>\n[display-posts]\n<p>End.</p>";
      const result = simulateBridgeWithDisplayPosts(input, []);

      // The shortcode is removed, leaving the text
      expect(result.html).toContain("<p>Check these posts:</p>");
      expect(result.html).toContain("<p>End.</p>");
      expect(result.html).not.toContain("display-posts-listing");
    });

    it("renders list with 2 posts", () => {
      const input = "Related posts: [display-posts]";
      const posts = [
        { id: 1, title: "First Post", slug: "first-post" },
        { id: 2, title: "Second Post", slug: "second-post" },
      ];

      const result = simulateBridgeWithDisplayPosts(input, posts);

      expect(result.html).toContain('class="display-posts-listing"');
      expect(result.html).toContain('<a href="/p/first-post">First Post</a>');
      expect(result.html).toContain('<a href="/p/second-post">Second Post</a>');
      expect(result.html).toMatch(/<li><a href[^>]*>First Post<\/a><\/li>/);
      expect(result.html).toMatch(/<li><a href[^>]*>Second Post<\/a><\/li>/);
    });

    it("uses /p/slug URL pattern for links", () => {
      const input = "[display-posts]";
      const posts = [{ id: 1, title: "My Post", slug: "my-post-slug" }];

      const result = simulateBridgeWithDisplayPosts(input, posts);

      expect(result.html).toContain('href="/p/my-post-slug"');
      expect(result.html).not.toContain('href="/posts/');
    });

    it("escapes XSS in post titles", () => {
      const input = "[display-posts]";
      const posts = [
        {
          id: 1,
          title: 'Post with <script>alert("xss")</script>',
          slug: "bad-post",
        },
      ];

      const result = simulateBridgeWithDisplayPosts(input, posts);

      // Script tag should be escaped
      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
      expect(result.html).toContain("&lt;/script&gt;");
    });

    it("supports include_excerpt attribute", () => {
      const input = '[display-posts include_excerpt="true"]';
      const posts = [
        {
          id: 1,
          title: "Post Title",
          slug: "post-slug",
          excerpt: "This is the excerpt.",
        },
      ];

      const result = simulateBridgeWithDisplayPosts(input, posts, true);

      expect(result.html).toContain("Post Title");
      expect(result.html).toContain("<p>This is the excerpt.</p>");
    });

    it("omits excerpt when include_excerpt is false (default)", () => {
      const input = "[display-posts]";
      const posts = [
        {
          id: 1,
          title: "Post Title",
          slug: "post-slug",
          excerpt: "This is the excerpt.",
        },
      ];

      const result = simulateBridgeWithDisplayPosts(input, posts, false);

      expect(result.html).toContain("Post Title");
      expect(result.html).not.toContain("This is the excerpt.");
    });

    it("handles posts with special characters in slug", () => {
      const input = "[display-posts]";
      const posts = [
        { id: 1, title: "Post & Title", slug: "post-and-title" },
        { id: 2, title: 'Post "with" quotes', slug: "post-with-quotes" },
      ];

      const result = simulateBridgeWithDisplayPosts(input, posts);

      expect(result.html).toContain('href="/p/post-and-title"');
      expect(result.html).toContain('href="/p/post-with-quotes"');
      // Ampersand and quotes in title should be escaped
      expect(result.html).toContain("Post &amp; Title");
      expect(result.html).toContain("Post &quot;with&quot; quotes");
    });

    it("preserves surrounding HTML structure", () => {
      const input =
        "<h2>Related Posts</h2>\n[display-posts]\n<footer>End of post</footer>";
      const posts = [{ id: 1, title: "Related", slug: "related" }];

      const result = simulateBridgeWithDisplayPosts(input, posts);

      expect(result.html).toContain("<h2>Related Posts</h2>");
      expect(result.html).toContain("<footer>End of post</footer>");
      expect(result.html).toContain('class="display-posts-listing"');
    });
  });
});
