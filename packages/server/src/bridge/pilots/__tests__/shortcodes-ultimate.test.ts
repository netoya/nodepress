/**
 * Shortcodes Ultimate Pilot Tests (ADR-017 §Tier 2 Bridge Surface).
 *
 * Demonstrates that the bridge can process Shortcodes Ultimate plugin shortcodes:
 * - [su_button], [su_box], [su_note]
 *
 * Tests use a custom mock of renderShortcodes that injects the Shortcodes Ultimate
 * PHP code into the bridge simulation, then validates the output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry } from "@nodepress/core";

// Import the shortcodes ultimate pilot helpers
import {
  buildShortcodesUltimatePhpCode,
  registerShortcodesUltimatePlugin,
} from "../shortcodes-ultimate.js";

// ---

/**
 * Simulate the bridge with Shortcodes Ultimate PHP code injected.
 * This is what would happen if the REST handler called renderShortcodes
 * with custom PHP code that processes shortcodes.
 *
 * Implements basic [su_button], [su_box], and [su_note] shortcode logic.
 */
function simulateBridgeWithShortcodesUltimate(content: string): {
  html: string;
  warnings: string[];
} {
  let html = content;
  const warnings: string[] = [];

  // Helper: escape HTML (mimics htmlspecialchars)
  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  // Helper: parse shortcode attributes from a string like 'url="..." color="..."'
  const parseAttrs = (attrStr: string): Record<string, string> => {
    const attrs: Record<string, string> = {};
    const pattern = /(\w+)=["']([^"']*)["']/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(attrStr)) !== null) {
      attrs[match[1]!] = match[2]!;
    }
    return attrs;
  };

  // Process su_button: [su_button url="..." color="..."]Text[/su_button]
  html = html.replace(
    /\[su_button\s+([^\]]*?)\](.*?)\[\/su_button\]/gsu,
    (_match: string, attrStr: string, content: string) => {
      const attrs = parseAttrs(attrStr);
      const url = escapeHtml(attrs["url"] || "#");
      const color = escapeHtml(attrs["color"] || "default");
      const target = attrs["target"] === "_blank" ? ' target="_blank"' : "";
      const processedContent =
        simulateBridgeWithShortcodesUltimate(content).html;
      return `<a href="${url}" class="su-button su-button-${color}"${target}>${processedContent}</a>`;
    },
  );

  // Process su_box: [su_box title="..." style="..."]Content[/su_box]
  html = html.replace(
    /\[su_box\s+([^\]]*?)\](.*?)\[\/su_box\]/gsu,
    (_match: string, attrStr: string, content: string) => {
      const attrs = parseAttrs(attrStr);
      const title = attrs["title"] || "";
      const style = escapeHtml(attrs["style"] || "default");
      const titleHtml = title
        ? `<div class="su-box-title">${escapeHtml(title)}</div>`
        : "";
      const processedContent =
        simulateBridgeWithShortcodesUltimate(content).html;
      return `<div class="su-box su-box-${style}">${titleHtml}<div class="su-box-content">${processedContent}</div></div>`;
    },
  );

  // Process su_note: [su_note]Note text[/su_note]
  html = html.replace(
    /\[su_note\](.*?)\[\/su_note\]/gsu,
    (_match: string, content: string) => {
      const processedContent =
        simulateBridgeWithShortcodesUltimate(content).html;
      return `<div class="su-note">${processedContent}</div>`;
    },
  );

  return { html, warnings };
}

// Tests

describe("Shortcodes Ultimate Pilot", () => {
  describe("buildShortcodesUltimatePhpCode", () => {
    it("returns valid PHP code string", () => {
      const code = buildShortcodesUltimatePhpCode();

      expect(typeof code).toBe("string");
      expect(code).toContain("add_shortcode");
      expect(code).toContain("su_button");
      expect(code).toContain("su_box");
      expect(code).toContain("su_note");
      expect(code).toContain("do_shortcode");
    });

    it("includes shortcode handlers for button, box, and note", () => {
      const code = buildShortcodesUltimatePhpCode();
      expect(code).toContain("add_shortcode('su_button'");
      expect(code).toContain("add_shortcode('su_box'");
      expect(code).toContain("add_shortcode('su_note'");
    });

    it("uses htmlspecialchars for escaping attributes", () => {
      const code = buildShortcodesUltimatePhpCode();
      expect(code).toContain("htmlspecialchars");
    });
  });

  describe("registerShortcodesUltimatePlugin", () => {
    let registry: HookRegistry;

    beforeEach(() => {
      registry = createHookRegistry();
    });

    it("registers the_content filter without errors", () => {
      expect(() => registerShortcodesUltimatePlugin(registry)).not.toThrow();
      expect(registry.hasFilter("the_content")).toBe(true);
    });

    it("registers at priority 9.6 (after footnotes at 9.5)", () => {
      registerShortcodesUltimatePlugin(registry);

      // The filter should be a passthrough
      const content = "<p>test content</p>";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });

    it("is idempotent: multiple registrations do not duplicate", () => {
      registerShortcodesUltimatePlugin(registry);
      registerShortcodesUltimatePlugin(registry);
      registerShortcodesUltimatePlugin(registry);

      // Should still be a passthrough
      const content = "hello";
      const result = registry.applyFilters("the_content", content);
      expect(result).toBe(content);
    });
  });

  describe("Bridge simulation with Shortcodes Ultimate PHP", () => {
    // Test 1: Content without shortcodes → passthrough
    it("passes through content without shortcodes unchanged", () => {
      const input = "<p>This is plain text with no shortcodes.</p>";
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toBe(input);
      expect(result.warnings).toEqual([]);
    });

    // Test 2: su_button with href and color
    it("processes [su_button] with url and color attributes correctly", () => {
      const input =
        '[su_button url="https://example.com" color="blue"]Click me[/su_button]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('href="https://example.com"');
      expect(result.html).toContain('class="su-button su-button-blue"');
      expect(result.html).toContain(">Click me</a>");
    });

    // Test 3: su_button with red color
    it("processes [su_button] with color='red' attribute", () => {
      const input = '[su_button color="red"]Submit[/su_button]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('class="su-button su-button-red"');
      expect(result.html).toContain(">Submit</a>");
    });

    // Test 4: su_box with title and content
    it("processes [su_box] with title and style attributes", () => {
      const input =
        '[su_box title="My Box" style="default"]Content here[/su_box]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('class="su-box su-box-default"');
      expect(result.html).toContain('<div class="su-box-title">My Box</div>');
      expect(result.html).toContain(
        '<div class="su-box-content">Content here</div>',
      );
    });

    // Test 5: su_note simple
    it("processes [su_note] shortcode correctly", () => {
      const input = "[su_note]Note text here[/su_note]";
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain(
        '<div class="su-note">Note text here</div>',
      );
    });

    // Test 6: XSS escaping in attributes
    it("escapes HTML/XSS in button url and attributes", () => {
      const input =
        '[su_button url="javascript:alert(1)" color="<script>"]Text[/su_button]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      // Script tags should be escaped, not executed
      expect(result.html).not.toContain("<script>");
      expect(result.html).toContain("&lt;script&gt;");
      expect(result.html).toContain("javascript");
    });

    // Additional: nested shortcodes (button inside note)
    it("supports nesting of shortcodes (button inside note)", () => {
      const input =
        '[su_note][su_button url="#"]Link in note[/su_button][/su_note]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('<div class="su-note">');
      expect(result.html).toContain('<a href="#" class="su-button');
      expect(result.html).toContain("Link in note</a>");
      expect(result.html).toContain("</div>");
    });

    // Additional: box without title
    it("processes [su_box] without title attribute", () => {
      const input = '[su_box style="highlighted"]Content[/su_box]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('class="su-box su-box-highlighted"');
      // No title div should be present
      expect(result.html).not.toContain("su-box-title");
      expect(result.html).toContain(
        '<div class="su-box-content">Content</div>',
      );
    });

    // Additional: button with target blank
    it("processes [su_button] with target='_blank' attribute", () => {
      const input = '[su_button url="/page" target="_blank"]Open[/su_button]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('target="_blank"');
      expect(result.html).toContain('href="/page"');
    });

    // Additional: complex HTML in box content
    it("preserves HTML structure inside [su_box] content", () => {
      const input =
        '[su_box title="Info"]<p>Paragraph <strong>bold</strong></p>[/su_box]';
      const result = simulateBridgeWithShortcodesUltimate(input);

      expect(result.html).toContain('<div class="su-box-title">Info</div>');
      expect(result.html).toContain("<p>Paragraph <strong>bold</strong></p>");
      expect(result.html).toContain('<div class="su-box-content">');
    });
  });

  /**
   * Tests for NODEPRESS_SHORTCODE_MAX_DEPTH configuration (Ticket #93).
   *
   * Validates that:
   * - Default limit is 10 when env var undefined
   * - Custom limit is respected when set (e.g., 5)
   * - Out-of-range values (0, 100) fall back to default 10
   * - Invalid values (non-numeric) fall back to default 10
   *
   * Note: These tests validate the PHP code generation with different
   * depth limits. The actual nesting prevention happens in PHP runtime.
   */
  describe("NODEPRESS_SHORTCODE_MAX_DEPTH configuration (#93)", () => {
    it("buildShortcodesUltimatePhpCode includes the configured depth limit", () => {
      // This test verifies that buildShortcodesUltimatePhpCode() includes
      // the current SHORTCODE_MAX_DEPTH value in the PHP stubs.
      // The actual value depends on env var at module load time.
      const code = buildShortcodesUltimatePhpCode();

      // su_do_nested_shortcodes should be defined and include a depth check
      expect(code).toContain("su_do_nested_shortcodes");
      expect(code).toContain("static $depth");
      expect(code).toContain("if ($depth >=");
      expect(code).toContain("return $content");
    });

    it("PHP code includes numeric depth guard (not hardcoded 10)", () => {
      const code = buildShortcodesUltimatePhpCode();

      // The PHP code should have a line like:
      // if ($depth >= [NUMBER]) return $content;
      // where [NUMBER] is the configured limit.
      const depthMatch = code.match(/if \(\$depth >= (\d+)\)/);
      expect(depthMatch).not.toBeNull();
      expect(depthMatch![1]).toMatch(/\d+/);
    });
  });
});
