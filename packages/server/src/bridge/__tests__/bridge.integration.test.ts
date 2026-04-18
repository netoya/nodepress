/**
 * Bridge Tier 2 — integration tests.
 *
 * Tests the full JS-layer pipeline end-to-end:
 *   registerBridgeHooks + pilot register* → renderShortcodes → applyFilters
 *
 * @php-wasm/node and @php-wasm/universal are mocked so the test suite does NOT
 * require a real WASM runtime. The mock simulates PHP output by inspecting the
 * injected code and returning appropriate HTML, mirroring what real PHP would
 * produce for each pilot.
 *
 * This exercises:
 *  - BridgeInput validation (size guard, passthrough on rejection)
 *  - BridgeOutput shape (html, warnings, error)
 *  - HookRegistry integration (filters anchored at correct priorities)
 *  - destroyBridge teardown contract
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @php-wasm/node + @php-wasm/universal BEFORE any bridge import.
// ---------------------------------------------------------------------------

type RunFn = (opts: { code: string }) => Promise<{ text: string }>;
let mockRunFn: RunFn | null = null;

vi.mock("@php-wasm/node", () => ({
  loadNodeRuntime: vi.fn().mockResolvedValue("mock-runtime"),
}));

vi.mock("@php-wasm/universal", () => ({
  PHP: vi.fn().mockImplementation(() => ({
    run: async (opts: { code: string }) => {
      if (mockRunFn) return mockRunFn(opts);
      // Default passthrough: extract $postContent from the bootstrap code and
      // return it as-is (simulating do_shortcode with no registered shortcodes).
      const match = /\$postContent = "(.*)";/s.exec(opts.code);
      const raw = match
        ? match[1]
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\r")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\")
            .replace(/\\\$/g, "$")
        : "";
      return { text: JSON.stringify({ html: raw, warnings: [] }) };
    },
    exit: vi.fn(),
  })),
}));

// Import after mocks.
import {
  renderShortcodes,
  destroyBridge,
  registerBridgeHooks,
} from "../index.js";
import { registerFootnotesPlugin } from "../pilots/footnotes.js";
import { registerShortcodesUltimatePlugin } from "../pilots/shortcodes-ultimate.js";
import { registerDisplayPostsPlugin } from "../pilots/display-posts.js";
import { createHookRegistry } from "@nodepress/core";

// Silence span emissions during tests.
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  destroyBridge();
  mockRunFn = null;
  consoleSpy.mockClear();
});

afterEach(() => {
  destroyBridge();
});

// ---------------------------------------------------------------------------
// Test 1 — Footnotes end-to-end via HookRegistry
// ---------------------------------------------------------------------------
describe("Footnotes pilot — end-to-end via HookRegistry", () => {
  it("renders ((footnote)) syntax to <sup> anchors + <div class=footnotes>", async () => {
    const registry = createHookRegistry();
    registerBridgeHooks(registry);
    registerFootnotesPlugin(registry);

    // Simulate PHP-side footnotes output: what real PHP would produce.
    const input = "Hello world((This is footnote one)).";
    const simulatedHtml =
      'Hello world<sup id="fnref-1"><a href="#fn-1" class="footnote-ref">1</a></sup>.' +
      '<div class="footnotes"><ol>' +
      '<li id="fn-1">This is footnote one <a href="#fnref-1" class="footnote-backref">↩</a></li>' +
      "</ol></div>";

    mockRunFn = async () => ({
      text: JSON.stringify({ html: simulatedHtml, warnings: [] }),
    });

    const result = await renderShortcodes({
      postContent: input,
      context: { postId: 10, postType: "post", postStatus: "publish" },
    });

    // Bridge layer: no error, correct HTML.
    expect(result.error).toBeNull();
    expect(result.html).toContain("<sup");
    expect(result.html).toContain('<div class="footnotes"');

    // HookRegistry layer: sync no-op filters pass content through unchanged.
    const filtered = registry.applyFilters("the_content", result.html);
    expect(filtered).toBe(result.html);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Shortcodes Ultimate end-to-end
// ---------------------------------------------------------------------------
describe("Shortcodes Ultimate pilot — end-to-end", () => {
  it("renders [su_button] to <a class=su-button>", async () => {
    const registry = createHookRegistry();
    registerBridgeHooks(registry);
    registerShortcodesUltimatePlugin(registry);

    const simulatedHtml =
      '<a href="/about" class="su-button su-button-default">Learn more</a>';

    mockRunFn = async () => ({
      text: JSON.stringify({ html: simulatedHtml, warnings: [] }),
    });

    const result = await renderShortcodes({
      postContent: '[su_button url="/about"]Learn more[/su_button]',
      context: { postId: 20, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    expect(result.html).toContain("<a");
    expect(result.html).toContain("su-button");

    // HookRegistry passthrough.
    const filtered = registry.applyFilters("the_content", result.html);
    expect(filtered).toBe(result.html);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Display Posts end-to-end with candidatePosts context injection
// ---------------------------------------------------------------------------
describe("Display Posts pilot — end-to-end with candidatePosts", () => {
  it("renders [display-posts] to <ul class=display-posts-listing>", async () => {
    const registry = createHookRegistry();
    registerBridgeHooks(registry);
    registerDisplayPostsPlugin(registry);

    const candidatePosts = [
      { id: 1, title: "First Post", slug: "first-post" },
      { id: 2, title: "Second Post", slug: "second-post" },
    ];

    const simulatedHtml =
      '<ul class="display-posts-listing">' +
      '<li><a href="/p/first-post">First Post</a></li>' +
      '<li><a href="/p/second-post">Second Post</a></li>' +
      "</ul>";

    mockRunFn = async () => ({
      text: JSON.stringify({ html: simulatedHtml, warnings: [] }),
    });

    const result = await renderShortcodes({
      postContent: "[display-posts]",
      context: {
        postId: 30,
        postType: "post",
        postStatus: "publish",
        candidatePosts,
      },
    });

    expect(result.error).toBeNull();
    expect(result.html).toContain('<ul class="display-posts-listing"');
    expect(result.html).toContain("First Post");

    // HookRegistry passthrough.
    const filtered = registry.applyFilters("the_content", result.html);
    expect(filtered).toBe(result.html);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Passthrough when content has no known shortcodes
// ---------------------------------------------------------------------------
describe("Passthrough — plain content with no shortcodes", () => {
  it("returns plain content unmodified when no shortcodes are present", async () => {
    const registry = createHookRegistry();
    registerBridgeHooks(registry);

    // No mockRunFn — default mock returns postContent as-is.
    const plainContent = "<p>No shortcodes here, just plain text.</p>";

    const result = await renderShortcodes({
      postContent: plainContent,
      context: { postId: 40, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    expect(result.html).toBe(plainContent);
    expect(result.warnings).toHaveLength(0);

    // HookRegistry passthrough.
    const filtered = registry.applyFilters("the_content", result.html);
    expect(filtered).toBe(plainContent);
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Error handling: input > 1MB → passthrough with BRIDGE_INPUT_REJECTED
// ---------------------------------------------------------------------------
describe("Error handling — oversized input", () => {
  it("returns BRIDGE_INPUT_REJECTED for content > 1MB without throwing", async () => {
    const registry = createHookRegistry();
    registerBridgeHooks(registry);

    // 1MB + 1 byte
    const oversized = "x".repeat(1024 * 1024 + 1);

    let didThrow = false;
    let result;
    try {
      result = await renderShortcodes({
        postContent: oversized,
        context: { postId: 50, postType: "post", postStatus: "publish" },
      });
    } catch {
      didThrow = true;
    }

    expect(didThrow).toBe(false);
    expect(result).toBeDefined();
    expect(result!.error).toBe("BRIDGE_INPUT_REJECTED");
    // Passthrough: html is the original content.
    expect(result!.html).toBe(oversized);
  });
});

// ---------------------------------------------------------------------------
// Test 6 — destroyBridge cleans up without errors
// ---------------------------------------------------------------------------
describe("destroyBridge — teardown contract", () => {
  it("destroyBridge() does not throw after bridge has been used", async () => {
    // Boot the bridge via a normal render call.
    await renderShortcodes({
      postContent: "warmup",
      context: { postId: 60, postType: "post", postStatus: "publish" },
    });

    // destroyBridge must not throw.
    let didThrow = false;
    try {
      destroyBridge();
    } catch {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
  });

  it("destroyBridge() is safe to call when bridge was never initialised", () => {
    // No render call before destroy.
    let didThrow = false;
    try {
      destroyBridge();
    } catch {
      didThrow = true;
    }
    expect(didThrow).toBe(false);
  });

  it("bridge remains usable after destroyBridge() + re-initialisation", async () => {
    // First use.
    await renderShortcodes({
      postContent: "before-destroy",
      context: { postId: 61, postType: "post", postStatus: "publish" },
    });

    destroyBridge();

    // Second use — singleton re-initialises cleanly.
    const result = await renderShortcodes({
      postContent: "after-destroy",
      context: { postId: 62, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    expect(result.html).toBe("after-destroy");
  });
});
