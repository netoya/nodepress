import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * public-site-shortcodes.spec.ts — CI spec for shortcode rendering on the
 * public site (/p/:slug).
 *
 * This file lives in admin/e2e/ (NOT demo/) so it runs automatically in CI
 * via playwright.config.ts (testIgnore excludes the demo/ directory).
 *
 * Prerequisites:
 *   Backend running on http://localhost:3000 with:
 *     - NODEPRESS_TIER2=true  (PHP-WASM bridge active)
 *     - "footnotes" plugin installed and active
 *     - "shortcodes-ultimate" plugin installed and active
 *
 * If the bridge is not available the positive shortcode tests are skipped
 * with a clear message rather than failing silently.
 *
 * Post creation uses the REST API directly — no admin UI — to keep the spec
 * fast and focused on the public render path (GET /p/:slug).
 */

const API_BASE = "http://localhost:3000";
const ADMIN_TOKEN = process.env.VITE_ADMIN_TOKEN ?? "dev-admin-token";

/** Creates a published post via the WP REST API and returns its slug. */
async function createPost(
  request: APIRequestContext,
  title: string,
  content: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/wp/v2/posts`, {
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: { title, content, status: "publish" },
  });

  if (!res.ok()) {
    throw new Error(
      `POST /wp/v2/posts failed: ${res.status()} ${await res.text()}`,
    );
  }

  const body = (await res.json()) as { slug: string; id: number };
  return body.slug;
}

/**
 * Check whether the PHP-WASM bridge is active by probing the backend health
 * or an env indicator. We call GET /wp/v2/posts (a cheap read) and inspect
 * response headers for x-nodepress-tier2. If the header is absent we assume
 * the bridge is not loaded and skip bridge-dependent tests.
 */
async function isBridgeAvailable(request: APIRequestContext): Promise<boolean> {
  try {
    const res = await request.get(`${API_BASE}/wp/v2/posts?per_page=1`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      failOnStatusCode: false,
    });
    // Backend sets x-nodepress-tier2: true when NODEPRESS_TIER2=true is active
    const tier2Header = res.headers()["x-nodepress-tier2"];
    return tier2Header === "true";
  } catch {
    return false;
  }
}

test.describe("Public site — shortcode rendering (/p/:slug)", () => {
  test.setTimeout(60_000);

  // ── Negative test ────────────────────────────────────────────────────────────
  test("plain post — no raw shortcode tags leaked into HTML body", async ({
    page,
    request,
  }) => {
    const slug = await createPost(
      request,
      `Plain post ${Date.now()}`,
      "This post has no shortcodes. Just plain text content.",
    );

    await page.goto(`${API_BASE}/p/${slug}`);
    await expect(page.locator("body")).toBeVisible({ timeout: 10_000 });

    const bodyText = await page.locator("body").innerHTML();

    // No raw shortcode tags should appear in the rendered HTML
    expect(bodyText).not.toContain("[footnote]");
    expect(bodyText).not.toContain("[/footnote]");
    expect(bodyText).not.toContain("[su_note]");
    expect(bodyText).not.toContain("[/su_note]");
  });

  // ── Positive test: footnote shortcode ────────────────────────────────────────
  test("footnote shortcode — renders sup ref and .footnotes section", async ({
    page,
    request,
  }) => {
    const bridgeReady = await isBridgeAvailable(request);
    if (!bridgeReady) {
      test.skip(
        true,
        "PHP-WASM bridge not active (NODEPRESS_TIER2=true required). " +
          "Start backend with NODEPRESS_TIER2=true to run this test.",
      );
    }

    const slug = await createPost(
      request,
      `Footnote test ${Date.now()}`,
      "Este texto tiene una nota[footnote]Esto es la nota al pie[/footnote] importante.",
    );

    await page.goto(`${API_BASE}/p/${slug}`);

    const article = page.locator("article");
    await expect(article).toBeVisible({ timeout: 10_000 });

    // The [footnote] shortcode should render a <sup> with a footnote ref link
    const supRef = article.locator("sup a.footnote-ref").first();
    await expect(supRef).toBeVisible({
      timeout: 10_000,
    });

    // A .footnotes section should appear at the bottom with the note text
    const footnotesSection = article.locator(".footnotes");
    await expect(footnotesSection).toBeVisible();
    await expect(footnotesSection).toContainText("Esto es la nota al pie");
  });

  // ── Positive test: su_note shortcode ─────────────────────────────────────────
  test("su_note shortcode — renders .su-note element with content", async ({
    page,
    request,
  }) => {
    const bridgeReady = await isBridgeAvailable(request);
    if (!bridgeReady) {
      test.skip(
        true,
        "PHP-WASM bridge not active (NODEPRESS_TIER2=true required). " +
          "Start backend with NODEPRESS_TIER2=true to run this test.",
      );
    }

    const slug = await createPost(
      request,
      `SU Note test ${Date.now()}`,
      '[su_note note_color="#f5f5f5"]Contenido destacado[/su_note]',
    );

    await page.goto(`${API_BASE}/p/${slug}`);

    const article = page.locator("article");
    await expect(article).toBeVisible({ timeout: 10_000 });

    // [su_note] should expand to a div with class su-note (Shortcodes Ultimate)
    const suNote = article.locator("div.su-note").first();
    await expect(suNote).toBeVisible({ timeout: 10_000 });
    await expect(suNote).toContainText("Contenido destacado");
  });
});
