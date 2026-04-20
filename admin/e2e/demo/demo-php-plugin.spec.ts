import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * demo-php-plugin.spec.ts — Video demo: post → plugin install UI → multi-plugin
 * shortcode post → public render.
 *
 * STATE SNAPSHOT 2026-04-19 (Román, ampliación multi-plugin):
 *   - NODEPRESS_TIER2=true registers every pilot in ACTIVE_PILOTS, which means
 *     `[footnote]`, `[su_*]` and `[contact-form-7]` are all processed by the
 *     PHP-WASM bridge before the_content filter runs. The previous note about
 *     BRIDGE_FATAL is outdated — the bridge ships valid HTML for these three
 *     families. We assert on the rendered markers below.
 *   - `[display-posts]` is intentionally excluded: the REST handler does not
 *     populate `context.candidatePosts`, so the shortcode expands to an empty
 *     string — a poor demo beat. Revisit when the handler feeds candidates.
 *   - Tier 2 and Demo mode remain mutually exclusive (index.ts guard), so we
 *     run with NODEPRESS_TIER2=true and NODEPRESS_DEMO_MODE=false. No [DEMO]
 *     prefix, no "Powered by NodePress" footer injected by the demo hook —
 *     the Tier 2 theme engine emits the footer itself in the single-post
 *     template.
 *   - POST /wp/v2/plugins from the admin InstallModal is still payload-
 *     incompatible with the backend schema (UI sends {slug}, backend requires
 *     {slug, name, version}). The spec seeds plugin rows directly via REST.
 *
 * Prerequisites (both must be running BEFORE this config):
 *   Backend: NODEPRESS_TIER2=true npm run dev                     (port 3000)
 *   Admin:   VITE_USE_MSW=false VITE_API_URL=http://localhost:3000 \
 *            VITE_ADMIN_TOKEN=dev-admin-token npm run dev          (port 5173)
 *
 * Scene breakdown (paced for video capture, not CI speed):
 *   1. Create a plain post from the admin UI.
 *   2. Jump to the public site /p/:slug to see it rendered.
 *   3. Open the Plugins page — empty state.
 *   4. Walk through the Install modal (fill slug, close without submit).
 *      Pre-install the three plugin rows via the REST API so the list
 *      populates with Footnotes + Shortcodes Ultimate + Contact Form 7.
 *   5. Create a second post that mixes `[footnote]`, `[su_note]`,
 *      `[su_button]` and `[contact-form-7]` shortcodes.
 *   6. Visit the public page of the shortcode post and assert the rendered
 *      markers for each plugin family.
 *
 * The admin token comes from VITE_ADMIN_TOKEN (backend validates against the
 * NODEPRESS_ADMIN_TOKEN env var — default "dev-admin-token"). Using a wrong
 * token breaks writes silently in the UI (toast error), so keep them aligned.
 */

const ADMIN_TOKEN = process.env.VITE_ADMIN_TOKEN ?? "dev-admin-token";
const API_BASE = "http://localhost:3000";

/**
 * Seed a plugin row directly via the REST API using the full payload the
 * backend schema requires. The admin InstallModal currently only sends
 * `{slug}` which is rejected upstream — this helper closes that gap so the
 * video can show the "plugin appears in the list" moment.
 *
 * The call may return 500 because the createPlugin handler response shape
 * is missing `name`/`version` (fast-json-stringify violation), but the INSERT
 * runs before the reply is serialised so the row is there regardless.
 */
async function seedPlugin(
  request: APIRequestContext,
  slug: string,
  name: string,
  version: string,
  description: string,
): Promise<void> {
  await request.post(`${API_BASE}/wp/v2/plugins`, {
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    data: {
      slug,
      name,
      version,
      author: "NodePress",
      meta: { description },
    },
    // Accept any status — the row is inserted before the 500 is returned.
    failOnStatusCode: false,
  });
}

/**
 * Slugs the demo seeds into the plugin registry. Cleaning these up between
 * runs keeps the empty-state scene honest when the script is re-recorded.
 */
const DEMO_PLUGIN_SLUGS = [
  "footnotes",
  "shortcodes-ultimate",
  "contact-form-7",
] as const;

test.describe("NodePress — PHP Plugin Demo", () => {
  // 2 minutes covers PHP-WASM cold start + deliberate pacing for the viewer.
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, request }) => {
    // 1. Best-effort cleanup: remove every demo plugin row so the list starts
    //    from an empty state for the viewer. DELETE /wp/v2/plugins/:slug
    //    returns 404 when the row does not exist, which is fine — we ignore
    //    it. (A real reset would TRUNCATE plugin_registry, but that is a
    //    root-level concern handled by demo:reset before the recording
    //    session.)
    for (const slug of DEMO_PLUGIN_SLUGS) {
      await request.delete(`${API_BASE}/wp/v2/plugins/${slug}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        failOnStatusCode: false,
      });
    }

    // 2. Inject the admin token + API base BEFORE the app boots so AuthGuard
    //    sees the credentials and does not bounce us to /#/login.
    await page.goto("/");
    await page.evaluate(
      ([token, apiBase]) => {
        localStorage.setItem("nodepress_admin_token", token);
        localStorage.setItem("nodepress_api_base", apiBase);
      },
      [ADMIN_TOKEN, API_BASE],
    );
  });

  test("authoring flow: plain post → multi-plugin install UI → shortcode post → public view", async ({
    page,
    request,
  }) => {
    // ── SCENE 1: Create a plain post in the admin ────────────────────────────
    await page.goto("/#/posts/new");
    await expect(page.getByRole("heading", { name: /new post/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800);

    const plainTitle = `Hello NodePress ${Date.now()}`;
    await page.getByLabel(/title/i).fill(plainTitle);
    await page.waitForTimeout(400);

    await page
      .getByLabel(/content/i)
      .fill(
        "NodePress runs WordPress-compatible hooks natively in Node.js. " +
          "No PHP server required for the core — plugins plug into a shared HookRegistry.",
      );
    await page.waitForTimeout(500);

    // Radix Select — combobox trigger + option item.
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: /^published$/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(/post created/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800);

    // PostEditorPage redirects to `/posts/:id/edit` on create success
    // (navigate in PostEditorPage.tsx). With createHashRouter that maps to
    // `#/posts/:id/edit`. Match both the list form and the edit form so the
    // spec is resilient to future router tweaks.
    await page.waitForURL(/#\/posts(\/\d+\/edit|\?|$)/, { timeout: 10_000 });
    await page.waitForTimeout(600);

    // ── SCENE 2: View the post on the public site ───────────────────────────
    // Extract the post id from the hash if the editor redirected to
    // /#/posts/:id/edit — that is the most reliable source of truth.
    const hashAfterCreate = await page.evaluate(() => window.location.hash);
    const idFromHash = hashAfterCreate.match(/posts\/(\d+)\/edit/)?.[1] ?? null;

    let plainSlug: string | null = null;
    if (idFromHash) {
      // Direct lookup by id — always works regardless of title mutations.
      const postRes = await request.get(
        `${API_BASE}/wp/v2/posts/${idFromHash}`,
      );
      if (postRes.ok()) {
        const postBody = (await postRes.json()) as { slug: string };
        plainSlug = postBody.slug;
      }
    }

    if (!plainSlug) {
      // Fallback: most recent published post (per_page=1, desc date).
      const listRes = await request.get(
        `${API_BASE}/wp/v2/posts?per_page=1&orderby=date&order=desc&status=publish`,
      );
      if (listRes.ok()) {
        const [latest] = (await listRes.json()) as Array<{ slug: string }>;
        plainSlug = latest?.slug ?? null;
      }
    }

    // Navigate directly to the single-post public page.
    await page.goto(plainSlug ? `${API_BASE}/p/${plainSlug}` : `${API_BASE}/`);
    await page.waitForTimeout(3000); // viewer reads the rendered page

    // ── SCENE 3: Plugins page — empty state ──────────────────────────────────
    await page.goto("/#/plugins");
    await expect(page.getByRole("heading", { name: /^plugins$/i })).toBeVisible(
      { timeout: 10_000 },
    );
    await page.waitForTimeout(1500); // let the empty state land for the viewer

    // ── SCENE 4: Open the Install modal, fill the slug, then close ───────────
    // The "Install plugin" header button (not the modal submit) — PluginsPage
    // renders it with aria-label="Install plugin".
    await page
      .getByRole("button", { name: "Install plugin", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(600);

    await page.getByLabel(/plugin slug/i).fill("footnotes");
    await page.waitForTimeout(1200); // let the viewer read what we typed

    // Cancel the modal instead of submitting — the backend rejects the
    // payload shape the admin sends today, and a red toast on camera is
    // a poor demo beat. Seed the rows through the REST API right after.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(400);

    // Seed the three plugin rows with the full, backend-valid payload so the
    // list populates on refetch. Rows are created even though the response is
    // 500 (the INSERT runs before the serialiser violates fast-json-stringify).
    await seedPlugin(
      request,
      "footnotes",
      "Footnotes",
      "1.0.0",
      "Adds classic WordPress-style footnotes to your posts via the [footnote] shortcode.",
    );
    await seedPlugin(
      request,
      "shortcodes-ultimate",
      "Shortcodes Ultimate",
      "7.0.0",
      "A mega-pack of shortcodes ([su_button], [su_note], [su_box], ...) for content authors.",
    );
    await seedPlugin(
      request,
      "contact-form-7",
      "Contact Form 7",
      "5.9.0",
      "Embed a classic WordPress contact form via the [contact-form-7] shortcode.",
    );

    // Trigger a full re-fetch by reloading the page. Navigating with the same
    // hash URL does NOT remount the React tree (hash router is same-route), so
    // React Query keeps its cached `[]` response and the UI stays on empty
    // state. A full page.reload() busts both caches cleanly.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /^plugins$/i }),
    ).toBeVisible();

    // The three plugin cards should all appear in the list.
    const footnotesCard = page.locator("li", { hasText: /footnotes/i }).first();
    const suCard = page
      .locator("li", { hasText: /shortcodes ultimate/i })
      .first();
    const cf7Card = page.locator("li", { hasText: /contact form 7/i }).first();
    await expect(footnotesCard).toBeVisible({ timeout: 10_000 });
    await expect(suCard).toBeVisible({ timeout: 10_000 });
    await expect(cf7Card).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(3000); // viewer reads the three installed cards

    // ── SCENE 5: Create a second post that mixes three plugin shortcodes ────
    await page.goto("/#/posts/new");
    await expect(page.getByRole("heading", { name: /new post/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800);

    const shortcodeTitle = `PHP Plugins Demo ${Date.now()}`;
    await page.getByLabel(/title/i).fill(shortcodeTitle);
    await page.waitForTimeout(400);

    // Mixed shortcodes: footnote anchors (Footnotes), su_note + su_button
    // (Shortcodes Ultimate), and a contact-form-7 form. Each family produces
    // distinct, asserted markers in the rendered HTML.
    const shortcodeBody = [
      "NodePress runs classic WordPress shortcodes through a PHP-WASM bridge.[footnote]The [footnote] shortcode comes from the Footnotes pilot.[/footnote]",
      "",
      "[su_note]Shortcodes Ultimate ships a whole family of content shortcodes — notes, buttons, boxes — all rendered server-side.[/su_note]",
      "",
      'Ready to try it? [su_button url="https://nodepress.dev" color="blue"]Visit NodePress[/su_button]',
      "",
      "And the classic Contact Form 7 keeps working too:[footnote]Form submission is out of scope for Tier 2; only the HTML is rendered.[/footnote]",
      "",
      '[contact-form-7 id="1" title="Demo contact form"]',
    ].join("\n");

    await page.getByLabel(/content/i).fill(shortcodeBody);
    await page.waitForTimeout(800);

    await page.getByRole("combobox", { name: /status/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: /^published$/i }).click();
    await page.waitForTimeout(500);

    await page.getByRole("button", { name: /^create$/i }).click();
    await expect(page.getByText(/post created/i)).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800);

    await page.waitForURL(/#\/posts(\/\d+\/edit|\?|$)/, { timeout: 10_000 });
    await page.waitForTimeout(600);

    // ── SCENE 6: View the shortcode post on the public site ─────────────────
    const hashAfterCreate2 = await page.evaluate(() => window.location.hash);
    const idFromHash2 =
      hashAfterCreate2.match(/posts\/(\d+)\/edit/)?.[1] ?? null;

    let scSlug: string | null = null;
    if (idFromHash2) {
      const postRes2 = await request.get(
        `${API_BASE}/wp/v2/posts/${idFromHash2}`,
      );
      if (postRes2.ok()) {
        const postBody2 = (await postRes2.json()) as { slug: string };
        scSlug = postBody2.slug;
      }
    }

    if (!scSlug) {
      const listRes2 = await request.get(
        `${API_BASE}/wp/v2/posts?per_page=1&orderby=date&order=desc&status=publish`,
      );
      if (listRes2.ok()) {
        const [latest2] = (await listRes2.json()) as Array<{ slug: string }>;
        scSlug = latest2?.slug ?? null;
      }
    }

    await page.goto(scSlug ? `${API_BASE}/p/${scSlug}` : `${API_BASE}/`);

    // Assert the rendered markers from each pilot family. These all live
    // inside the <article> rendered by the Tier 2 public handler.
    const articleLocator = page.locator("article");
    await expect(articleLocator).toBeVisible({ timeout: 10_000 });

    // Footnotes pilot — each [footnote] becomes a numbered <sup> anchor and
    // appends a <div class="footnotes"><ol>…</ol></div> section.
    await expect(
      articleLocator.locator("sup#fnref-1 a.footnote-ref"),
    ).toBeVisible();
    await expect(
      articleLocator.locator("sup#fnref-2 a.footnote-ref"),
    ).toBeVisible();
    await expect(
      articleLocator.locator("div.footnotes ol li#fn-1"),
    ).toBeVisible();
    await expect(
      articleLocator.locator("div.footnotes ol li#fn-2"),
    ).toBeVisible();

    // Shortcodes Ultimate pilot — [su_note] expands to <div class="su-note">,
    // [su_button] expands to <a class="su-button su-button-blue">.
    await expect(articleLocator.locator("div.su-note")).toBeVisible();
    const suButton = articleLocator
      .locator("a.su-button.su-button-blue")
      .first();
    await expect(suButton).toBeVisible();
    await expect(suButton).toHaveAttribute("href", "https://nodepress.dev");

    // Contact Form 7 pilot — [contact-form-7] expands to the wpcf7 wrapper
    // plus its familiar <form class="wpcf7-form"> scaffolding.
    await expect(
      articleLocator.locator("div.wpcf7 form.wpcf7-form"),
    ).toBeVisible();
    await expect(
      articleLocator.locator('input[name="your-name"].wpcf7-text'),
    ).toBeVisible();
    await expect(
      articleLocator.locator('input[name="your-email"].wpcf7-email'),
    ).toBeVisible();
    await expect(
      articleLocator.locator("textarea.wpcf7-textarea"),
    ).toBeVisible();

    // Hold the final frame for the viewer to see the fully-rendered page.
    await page.waitForTimeout(5000);
  });
});
