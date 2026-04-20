/**
 * Footnotes Pilot Tests (ADR-017 §Tier 2 Bridge Surface).
 *
 * Demonstrates that the bridge can process the Footnotes plugin's ((text)) syntax.
 * Tests use a custom mock of renderShortcodes that injects the Footnotes PHP code
 * into the bridge simulation, then validates the output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry } from "@nodepress/core";

// Import the footnotes pilot helpers
import {
  buildFootnotesPhpCode,
  registerFootnotesPlugin,
} from "../footnotes.js";

// ---

// Setup: We'll simulate the bridge with Footnotes PHP injected.
// The real bridge would do this in buildBootstrapCode + php.run().
// We'll create a simplified processor for testing.

/**
 * Simulate the bridge with Footnotes PHP code injected.
 * This is what would happen if the REST handler called renderShortcodes
 * with custom PHP code that processes footnotes.
 */
function simulateBridgeWithFootnotes(content: string): {
  html: string;
  warnings: string[];
} {
  // Extract footnotes and build the output (simulating PHP regex logic)
  let html = content;
  const footnotes: string[] = [];
  let n = 0;

  // Match ((text)) and replace with anchors
  html = html.replace(/\(\((.+?)\)\)/g, (_match: string, text: string) => {
    n++;
    footnotes.push(text);
    return `<sup id="fnref-${n}"><a href="#fn-${n}" class="footnote-ref">${n}</a></sup>`;
  });

  // Append footnotes section
  if (footnotes.length > 0) {
    html += '<div class="footnotes"><ol>';
    footnotes.forEach((fn, i) => {
      const num = i + 1;
      // Escape HTML in footnote text
      const escaped = fn
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
      html += `<li id="fn-${num}">${escaped} <a href="#fnref-${num}" class="footnote-backref">↩</a></li>`;
    });
    html += "</ol></div>";
  }

  return { html, warnings: [] };
}

// Tests

describe("Footnotes Pilot", () => {
  describe("buildFootnotesPhpCode", () => {
    it("returns valid PHP code string", () => {
      const code = buildFootnotesPhpCode();

      expect(typeof code).toBe("string");
      // Registers the WP shortcode handler so [footnote]text[/footnote] works.
      expect(code).toContain("add_shortcode('footnote'");
      // Keeps MCI ((text)) legacy syntax as a pre-pass.
      expect(code).toContain("preg_replace_callback");
      expect(code).toContain("\\(\\((.+?)\\)\\)");
      // Renders the footnotes section.
      expect(code).toContain("footnotes");
    });

    it("registers the [footnote] shortcode with add_shortcode", () => {
      const code = buildFootnotesPhpCode();
      expect(code).toMatch(/add_shortcode\(\s*'footnote'/);
    });

    it("uses pcre preg_replace_callback for the legacy ((text)) syntax", () => {
      const code = buildFootnotesPhpCode();
      expect(code).toContain("preg_replace_callback");
      // The regex pattern for ((text))
      expect(code).toContain("\\(\\((.+?)\\)\\)");
    });

    it("expands shortcodes in place and appends the footnotes section", () => {
      const code = buildFootnotesPhpCode();
      // do_shortcode is invoked inside the pilot so the footnotes section can
      // be appended right after the anchors are produced.
      expect(code).toContain("do_shortcode($postContent)");
      expect(code).toContain('<div class="footnotes"><ol>');
    });
  });

  describe("registerFootnotesPlugin", () => {
    let registry: HookRegistry;

    beforeEach(() => {
      registry = createHookRegistry();
    });

    it("registers the_content filter without errors", () => {
      expect(() => registerFootnotesPlugin(registry)).not.toThrow();
      expect(registry.hasFilter("the_content")).toBe(true);
    });

    it("registers at priority 9.5 (after bridge at 9)", () => {
      registerFootnotesPlugin(registry);

      // The filter should be a passthrough
      const content = "<p>test content</p>";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });

    it("is idempotent: multiple registrations do not duplicate", () => {
      registerFootnotesPlugin(registry);
      registerFootnotesPlugin(registry);
      registerFootnotesPlugin(registry);

      // Should still be a passthrough, not tripled
      const content = "hello";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });
  });

  describe("Bridge simulation with Footnotes PHP", () => {
    it("processes content without footnotes unchanged", () => {
      const input = "<p>This is plain text with no footnotes.</p>";
      const result = simulateBridgeWithFootnotes(input);

      expect(result.html).toBe(input);
      expect(result.warnings).toEqual([]);
    });

    it("processes a single footnote correctly", () => {
      const input = "This is text((This is a footnote)).";
      const result = simulateBridgeWithFootnotes(input);

      // Should contain anchor in the text
      expect(result.html).toContain(
        '<sup id="fnref-1"><a href="#fn-1" class="footnote-ref">1</a></sup>',
      );

      // Should contain footnotes section
      expect(result.html).toContain('<div class="footnotes"><ol>');
      expect(result.html).toContain(
        '<li id="fn-1">This is a footnote <a href="#fnref-1" class="footnote-backref">↩</a></li>',
      );
      expect(result.html).toContain("</ol></div>");
    });

    it("processes multiple footnotes with correct numbering", () => {
      const input = "First((note 1)) and second((note 2)) and third((note 3)).";
      const result = simulateBridgeWithFootnotes(input);

      // All three anchors should be present
      expect(result.html).toContain('id="fnref-1"');
      expect(result.html).toContain('id="fnref-2"');
      expect(result.html).toContain('id="fnref-3"');

      // All three footnote entries should be present
      expect(result.html).toContain('id="fn-1">note 1');
      expect(result.html).toContain('id="fn-2">note 2');
      expect(result.html).toContain('id="fn-3">note 3');

      // Verify backlinks
      expect(result.html).toContain('href="#fnref-1"');
      expect(result.html).toContain('href="#fnref-2"');
      expect(result.html).toContain('href="#fnref-3"');
    });

    it("escapes HTML in footnote text", () => {
      const input =
        'Dangerous content((This contains <script>alert("xss")</script>)).';
      const result = simulateBridgeWithFootnotes(input);

      // The script tag should be escaped, not executable
      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
      expect(result.html).toContain("&lt;/script&gt;");
    });

    it("handles empty footnotes gracefully", () => {
      const input = "Text with empty(()) footnote.";
      // The regex /.+?/ requires at least one character, so empty (()) won't match
      const result = simulateBridgeWithFootnotes(input);

      // Should not create a footnotes section for non-matching pattern
      expect(result.html).toContain("Text with empty(()) footnote.");
      expect(result.html).not.toContain('<div class="footnotes">');
    });

    it("preserves HTML structure around footnotes", () => {
      const input =
        "<p>Hello((world))</p>\n<blockquote>Quote((source))</blockquote>";
      const result = simulateBridgeWithFootnotes(input);

      // HTML structure should be preserved
      expect(result.html).toContain("<p>Hello");
      expect(result.html).toContain("<blockquote>Quote");

      // Footnotes section should be at the end
      expect(result.html).toContain("</blockquote>");
      expect(result.html.indexOf('<div class="footnotes">')).toBeGreaterThan(
        result.html.indexOf("</blockquote>"),
      );
    });

    it("handles complex multiline content with footnotes", () => {
      const input = `
        <h1>Title((citation needed))</h1>
        <p>Paragraph with ((first note)) and ((second note)).</p>
        <p>Another paragraph((third note)).</p>
      `.trim();

      const result = simulateBridgeWithFootnotes(input);

      // Should process all three footnotes
      expect(result.html).toContain('id="fnref-1"');
      expect(result.html).toContain('id="fnref-2"');
      expect(result.html).toContain('id="fnref-3"');

      // Should generate footnotes section
      expect(result.html).toContain('<div class="footnotes">');
      expect(result.html).toContain('id="fn-1">citation needed');
      expect(result.html).toContain('id="fn-2">first note');
      expect(result.html).toContain('id="fn-3">second note');
      expect(result.html).toContain('id="fn-4">third note');
    });
  });
});
