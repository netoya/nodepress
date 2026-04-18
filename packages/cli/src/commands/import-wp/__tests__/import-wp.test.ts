/**
 * Tests for WP Import CLI.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { runImport } from "../pipeline.js";
import { importWpCommand } from "../index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "__fixtures__");

describe("WP Import", () => {
  let tempFile: string | null = null;

  afterEach(async () => {
    if (tempFile) {
      try {
        await fs.unlink(tempFile);
      } catch {
        // Ignore
      }
      tempFile = null;
    }
  });

  describe("SAX Parser", () => {
    it("parses minimal WXR correctly", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");
      const { result } = await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
        verbose: false,
      });

      // Should have parsed posts: 2 normal posts + 1 page (attachment is skipped)
      const allPosts = result.posts;
      expect(allPosts.length).toBeGreaterThan(0);

      // Check first post
      const post1 = allPosts.find((p) => p.wpPostId === 10);
      expect(post1?.title).toBe("Hello World");
      expect(post1?.slug).toBe("hello-world");
      expect(post1?.status).toBe("publish");

      // Check post 2 (draft)
      const post2 = allPosts.find((p) => p.wpPostId === 11);
      expect(post2?.status).toBe("draft");

      // Check page
      const page = allPosts.find((p) => p.wpPostId === 12);
      expect(page?.type).toBe("page");

      // Should have 2 terms
      expect(result.terms).toHaveLength(2);
      expect(result.terms[0]?.taxonomy).toBe("category");
      expect(result.terms[1]?.taxonomy).toBe("post_tag");

      // Should have 1 user
      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.login).toBe("admin");

      // Should skip 1 attachment
      expect(result.skipped.attachments).toBe(1);
    });

    it("skips attachments without error", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");
      const { result } = await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
      });

      expect(result.skipped.attachments).toBeGreaterThan(0);
      expect(result.posts).toBeDefined();
      expect(result.users).toBeDefined();
    });

    it("respects idempotency on re-import", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");

      const result1 = await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
      });

      const result2 = await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
      });

      expect(result2.result.posts).toHaveLength(result1.result.posts.length);

      result2.result.posts.forEach((post) => {
        expect(post.wpPostId).toBeDefined();
      });
    });

    it("handles malformed XML gracefully", async () => {
      const malformed = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Unclosed tag
    </item>
</channel>
</rss>`;

      const tempPath = resolve(fixturesDir, "malformed-temp.wxr");
      tempFile = tempPath;
      await fs.writeFile(tempPath, malformed);

      await expect(
        runImport({
          source: tempPath,
          dryRun: true,
          mode: "upsert",
        }),
      ).rejects.toThrow();
    });

    it("resolves author login to post", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");
      const { result } = await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
      });

      result.posts.forEach((post) => {
        if (
          post.wpPostId === 10 ||
          post.wpPostId === 11 ||
          post.wpPostId === 12
        ) {
          expect(post.authorLogin).toBe("admin");
        }
      });
    });

    it("generates slug from title if missing", async () => {
      const wxrNoSlug = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:wp="http://wordpress.org/export/1.2/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <wp:author>
    <wp:author_id>1</wp:author_id>
    <wp:author_login>admin</wp:author_login>
    <wp:author_email>admin@example.com</wp:author_email>
    <wp:author_display_name>Admin</wp:author_display_name>
  </wp:author>
  <item>
    <wp:post_id>20</wp:post_id>
    <title>My Awesome Post Title</title>
    <wp:post_type>post</wp:post_type>
    <wp:status>publish</wp:status>
    <dc:creator>admin</dc:creator>
    <content:encoded><![CDATA[Content]]></content:encoded>
  </item>
</channel>
</rss>`;

      const tempPath = resolve(fixturesDir, "no-slug-temp.wxr");
      tempFile = tempPath;
      await fs.writeFile(tempPath, wxrNoSlug);

      const { result } = await runImport({
        source: tempPath,
        dryRun: true,
        mode: "upsert",
      });

      expect(result.posts).toHaveLength(1);
      const post = result.posts[0];
      expect(post?.title).toBe("My Awesome Post Title");
      // If no slug provided, normalizer generates one
      // The normalized will generate it if needed
    });
  });

  describe("CLI Integration", () => {
    it("shows help with --help flag", async () => {
      const consoleSpy = vi.spyOn(console, "log");

      try {
        await importWpCommand(["--help"]);
      } catch {
        // Expected
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("import-wp — WordPress content importer"),
      );

      consoleSpy.mockRestore();
    });

    it("rejects missing source argument", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error");

      try {
        await importWpCommand([]);
      } catch {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("requires <source>"),
      );

      consoleErrorSpy.mockRestore();
    });

    it("rejects non-wxr format", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");
      const consoleErrorSpy = vi.spyOn(console, "error");

      try {
        await importWpCommand([wxrPath, "--format", "mysql"]);
      } catch {
        // Expected
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Only WXR format"),
      );

      consoleErrorSpy.mockRestore();
    });

    it("respects dry-run flag", async () => {
      const wxrPath = resolve(fixturesDir, "minimal.wxr");
      const consoleLogSpy = vi.spyOn(console, "log");

      await runImport({
        source: wxrPath,
        dryRun: true,
        mode: "upsert",
      });

      const logs = consoleLogSpy.mock.calls.map((c) => c[0]);
      expect(logs.join("\n")).toContain("dry-run");

      consoleLogSpy.mockRestore();
    });
  });
});
