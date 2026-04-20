import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * demo-php-plugin.spec.ts — Video demo: post → plugin install UI → shortcode post.
 *
 * REAL STATE DISCOVERED 2026-04-19 (Román):
 *   - POST /wp/v2/plugins from the admin InstallModal is payload-incompatible with
 *     the backend schema (UI sends {slug}, backend requires {slug, name, version}).
 *     The installer fails with 400/500 even though the row IS persisted to DB.
 *   - Tier 2 and Demo mode are mutually exclusive (index.ts guard), so we run with
 *     NODEPRESS_TIER2=true and NODEPRESS_DEMO_MODE=false. No [DEMO] prefix, no
 *     "Powered by NodePress" footer injected by the demo hook — the Tier 2 theme
 *     engine emits the footer itself in the single-post template.
 *   - The PHP-WASM bridge currently fails BRIDGE_FATAL in this environment,
 *     so shortcodes render unprocessed. Tracked separately. The spec therefore
 *     does NOT assert rendered-shortcode output — it shows the authoring flow.
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
 *      Pre-install the plugin row via the REST API so the list populates.
 *   5. Create a second post that contains the `[footnote]...[/footnote]`
 *      shortcode to showcase the authoring story.
 *   6. Visit the public page of the shortcode post.
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
      meta: {
        description:
          "Adds classic WordPress-style footnotes to your posts via the [footnote] shortcode.",
      },
    },
    // Accept any status — the row is inserted before the 500 is returned.
    failOnStatusCode: false,
  });
}

test.describe("NodePress — PHP Plugin Demo", () => {
  // 2 minutes covers PHP-WASM cold start + deliberate pacing for the viewer.
  test.setTimeout(180_000);

  test.beforeEach(async ({ page, request }) => {
    // 1. Best-effort cleanup: mark the footnotes plugin as uninstalled so it
    //    drops out of the default list. DELETE /wp/v2/plugins/:slug returns
    //    404 when the row does not exist, which is fine — we ignore it.
    //    (A real reset would TRUNCATE plugin_registry, but that is a root-level
    //    concern handled by demo:reset before the recording session.)
    await request.delete(`${API_BASE}/wp/v2/plugins/footnotes`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      failOnStatusCode: false,
    });

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

  test("authoring flow: plain post → plugins UI → shortcode post → public view", async ({
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
      const postRes = await request.get(`${API_BASE}/wp/v2/posts/${idFromHash}`);
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
    await page.goto(
      plainSlug ? `${API_BASE}/p/${plainSlug}` : `${API_BASE}/`,
    );
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
    // a poor demo beat. Seed the row through the REST API right after.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(400);

    // Seed the plugin row with the full, backend-valid payload so the list
    // updates on refetch. The row is created even though the response is 500.
    await seedPlugin(request, "footnotes", "Footnotes", "1.0.0");

    // Trigger a full re-fetch by reloading the page. Navigating with the same
    // hash URL does NOT remount the React tree (hash router is same-route), so
    // React Query keeps its cached `[]` response and the UI stays on empty
    // state. A full page.reload() busts both caches cleanly.
    await page.reload();
    await expect(
      page.getByRole("heading", { name: /^plugins$/i }),
    ).toBeVisible();

    // The Footnotes card should appear in the list.
    const footnotesCard = page.locator("li", { hasText: /footnotes/i }).first();
    await expect(footnotesCard).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(2500); // viewer reads the installed plugin card

    // ── SCENE 5: Create a second post that uses the [footnote] shortcode ─────
    await page.goto("/#/posts/new");
    await expect(page.getByRole("heading", { name: /new post/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.waitForTimeout(800);

    const shortcodeTitle = `Footnotes Demo ${Date.now()}`;
    await page.getByLabel(/title/i).fill(shortcodeTitle);
    await page.waitForTimeout(400);

    await page
      .getByLabel(/content/i)
      .fill(
        "NodePress supports classic WordPress shortcodes.[footnote]Shortcodes are short text tags wrapped in square brackets.[/footnote]\n\n" +
          "The Footnotes plugin[footnote]Ports the MCI Footnotes behaviour to the Tier 2 bridge.[/footnote] runs inside php-wasm — a WebAssembly PHP runtime embedded in Node.js.",
      );
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

    // Hold the final frame for the viewer. We intentionally do NOT assert on
    // the rendered shortcode because the PHP-WASM bridge is in a known
    // BRIDGE_FATAL state in this environment — the content comes through
    // verbatim. Once the bridge is fixed, add assertions here for
    // `<sup>` / `.footnote-ref` markers.
    await page.waitForTimeout(5000);
  });
});
