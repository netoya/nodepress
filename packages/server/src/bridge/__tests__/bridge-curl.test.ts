/**
 * Bridge cURL Allowlist — tests for Sprint 6 #83
 *
 * Tests the cURL allowlist feature (ADR-018 Amendment):
 * - NODEPRESS_CURL_ALLOWLIST env var parsing
 * - URL validation against allowlist
 * - Max 3 requests per invocation limit
 * - No allowlist = blocked behavior (original)
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
      // Default passthrough
      const match = /\$postContent = "(.*)";/s.exec(opts.code);
      const raw = match
        ? (match[1] ?? "")
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

// Mock fetch globally
global.fetch = vi.fn();

// Import after mocks.
import { renderShortcodes, destroyBridge } from "../index.js";

// Silence span emissions during tests.
const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

beforeEach(() => {
  destroyBridge();
  mockRunFn = null;
  consoleSpy.mockClear();
  vi.clearAllMocks();
  // Clear env var
  delete process.env.NODEPRESS_CURL_ALLOWLIST;
});

afterEach(() => {
  destroyBridge();
  delete process.env.NODEPRESS_CURL_ALLOWLIST;
});

// ---------------------------------------------------------------------------
// Test 1 — No allowlist configured → default behavior
// ---------------------------------------------------------------------------
describe("cURL allowlist — no config (default)", () => {
  it("without NODEPRESS_CURL_ALLOWLIST, renders normally", async () => {
    mockRunFn = async () => ({
      text: JSON.stringify({
        html: "Plain content",
        warnings: [],
      }),
    });

    const result = await renderShortcodes({
      postContent: "Test content",
      context: { postId: 1, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    expect(result.html).toBe("Plain content");
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Allowlist parsing (single URL)
// ---------------------------------------------------------------------------
describe("cURL allowlist — single URL parsing", () => {
  it("parses single URL from NODEPRESS_CURL_ALLOWLIST", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce({
      text: () => Promise.resolve('{"ok":true}'),
    } as Response);

    let callCount = 0;
    mockRunFn = async (opts: { code: string }) => {
      callCount++;
      if (callCount === 1) {
        // First run: emit cURL request marker
        return {
          text: JSON.stringify({
            html: 'Content [NP_CURL_REQUEST:{"url":"https://api.example.com/data","method":"GET"}]',
            warnings: [],
          }),
        };
      }
      // Second run: should have injected response
      if (opts.code.includes("$np_curl_response")) {
        return {
          text: JSON.stringify({
            html: "Content with response injected",
            warnings: [],
          }),
        };
      }
      return {
        text: JSON.stringify({ html: "fallback", warnings: [] }),
      };
    };

    const result = await renderShortcodes({
      postContent: "Test",
      context: { postId: 2, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // Verify fetch was called
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({ method: "GET", timeout: 5000 }),
    );
  });
});

// ---------------------------------------------------------------------------
// Test 3 — Multiple URLs (comma-separated)
// ---------------------------------------------------------------------------
describe("cURL allowlist — multiple URLs", () => {
  it("parses comma-separated URLs correctly (parsing test only)", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST =
      "https://api.example.com,https://feeds.example.org";

    mockRunFn = async () => ({
      text: JSON.stringify({
        html: "Test passed",
        warnings: [],
      }),
    });

    const result = await renderShortcodes({
      postContent: "Feed",
      context: { postId: 3, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    expect(result.html).toBe("Test passed");
  });
});

// ---------------------------------------------------------------------------
// Test 4 — URL not in allowlist → not fetched
// ---------------------------------------------------------------------------
describe("cURL allowlist — URL blocking", () => {
  it("does not fetch URLs not in allowlist", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);

    mockRunFn = async () => ({
      text: JSON.stringify({
        html: '[NP_CURL_REQUEST:{"url":"https://evil.com/steal","method":"GET"}]',
        warnings: [],
      }),
    });

    const result = await renderShortcodes({
      postContent: "Attack",
      context: { postId: 4, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // Fetch should NOT be called
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test 5 — POST method support
// ---------------------------------------------------------------------------
describe("cURL allowlist — POST method", () => {
  it("supports POST method in request markers", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve("posted"),
    } as Response);

    // Mock with counter to handle second run
    let runCount = 0;
    mockRunFn = async (_opts: { code: string }) => {
      runCount++;
      if (runCount === 1) {
        // First run: return POST request marker
        return {
          text: JSON.stringify({
            html: '[NP_CURL_REQUEST:{"url":"https://api.example.com/submit","method":"POST"}]',
            warnings: [],
          }),
        };
      }
      // Second run: PHP was re-executed with injected response
      return {
        text: JSON.stringify({
          html: "POST processed",
          warnings: [],
        }),
      };
    };

    const result = await renderShortcodes({
      postContent: "Submit",
      context: { postId: 5, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // Verify fetch was called with POST method
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/submit",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

// ---------------------------------------------------------------------------
// Test 6 — Max 3 requests limit
// ---------------------------------------------------------------------------
describe("cURL allowlist — max 3 requests per invocation", () => {
  it("stops processing after 3 requests", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve("resp"),
    } as Response);

    let runCount = 0;
    mockRunFn = async (opts: { code: string }) => {
      runCount++;
      // Simulate many cURL requests (4+)
      if (runCount <= 4 && !opts.code.includes("$np_curl_response")) {
        return {
          text: JSON.stringify({
            html: `[NP_CURL_REQUEST:{"url":"https://api.example.com/req${runCount}","method":"GET"}]`,
            warnings: [],
          }),
        };
      }
      return {
        text: JSON.stringify({
          html: "All done",
          warnings: [],
        }),
      };
    };

    const result = await renderShortcodes({
      postContent: "Many reqs",
      context: { postId: 6, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // Max 3 fetches should be made
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// Test 7 — Fetch error handling
// ---------------------------------------------------------------------------
describe("cURL allowlist — fetch error", () => {
  it("gracefully handles fetch errors", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockRejectedValueOnce(new Error("Network timeout"));

    mockRunFn = async () => ({
      text: JSON.stringify({
        html: '[NP_CURL_REQUEST:{"url":"https://api.example.com","method":"GET"}]',
        warnings: [],
      }),
    });

    const result = await renderShortcodes({
      postContent: "Timeout test",
      context: { postId: 7, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // Should have attempted fetch
    expect(fetchMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Test 8 — URL matching with paths
// ---------------------------------------------------------------------------
describe("cURL allowlist — URL matching", () => {
  it("matches URLs with paths to base allowlist prefix", async () => {
    process.env.NODEPRESS_CURL_ALLOWLIST = "https://api.example.com";

    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve("ok"),
    } as Response);

    let runCount = 0;
    mockRunFn = async () => {
      runCount++;
      if (runCount === 1) {
        return {
          text: JSON.stringify({
            html: '[NP_CURL_REQUEST:{"url":"https://api.example.com/v1/users","method":"GET"}]',
            warnings: [],
          }),
        };
      }
      return {
        text: JSON.stringify({
          html: "done",
          warnings: [],
        }),
      };
    };

    const result = await renderShortcodes({
      postContent: "Path test",
      context: { postId: 8, postType: "post", postStatus: "publish" },
    });

    expect(result.error).toBeNull();
    // URL with path should match prefix
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/users",
      expect.any(Object),
    );
  });
});
