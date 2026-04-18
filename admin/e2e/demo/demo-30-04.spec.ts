import { test, expect } from "@playwright/test";

/**
 * demo-30-04.spec.ts — End-to-end demo flow for the 30-04 CTO walkthrough video.
 *
 * Requires the full stack running in demo mode:
 *   Backend: NODEPRESS_DEMO_MODE=true npm run dev   (port 3000)
 *   Admin:   VITE_USE_MSW=false VITE_API_URL=http://localhost:3000 npm run dev  (port 5173)
 *
 * What this demonstrates:
 *   1. Dashboard landing with 5 seeded posts
 *   2. Posts list — seeded titles visible
 *   3. Create a new post via the form (POST /wp/v2/posts)
 *   4. Sprint 3: TaxonomySelector — Categories and Tags panels visible in the editor
 *   5. Sprint 3: Select a category before publishing (TaxonomySelector checkbox interaction)
 *   6. Hook system proof: title gets [DEMO] prefix (pre_save_post filter)
 *   7. Hook system proof: content gets "Powered by NodePress" footer (the_content filter)
 *
 * Pacing: deliberate waitForTimeout calls so a human viewer can follow.
 */
test.describe("NodePress 30-04 Demo Flow", () => {
  test("full CTO walkthrough: dashboard → create post → hook mutation visible", async ({
    page,
  }) => {
    // ── 1. Dashboard landing ──────────────────────────────────────────────────
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /dashboard/i }),
    ).toBeVisible();
    // Should see seeded posts count in summary cards / list
    await page.waitForTimeout(800);

    // ── 2. Navigate to Posts list ─────────────────────────────────────────────
    // Navigate via hash (App.tsx uses window.location.hash for Sprint 1 routing)
    await page.goto("/#posts");
    await expect(page.getByRole("heading", { name: /^posts$/i })).toBeVisible();
    await page.waitForTimeout(800);

    // ── 3. See the 5 seeded posts ─────────────────────────────────────────────
    await expect(page.getByText(/welcome to nodepress/i)).toBeVisible();
    await page.waitForTimeout(500);

    // ── 4. Click "Add new" ────────────────────────────────────────────────────
    await page.getByRole("button", { name: /add new/i }).click();
    await expect(
      page.getByRole("heading", { name: /new post/i }),
    ).toBeVisible();
    await page.waitForTimeout(800);

    // ── 5. Fill form (timestamped title avoids slug collision on reruns) ──────
    const demoTitle = `Hello from demo ${Date.now()}`;
    await page.getByLabel(/title/i).fill(demoTitle);
    await page.getByLabel(/content/i).fill("This content will get a footer.");

    // Change status from draft (default) → publish so it shows on the public home.
    // Radix Select: click the trigger (combobox role), then the option.
    await page.getByRole("combobox", { name: /status/i }).click();
    await page.waitForTimeout(300);
    await page.getByRole("option", { name: /^published$/i }).click();
    await page.waitForTimeout(500);

    // ── Sprint 3: Taxonomy selectors visible ──────────────────────────────────
    // TaxonomySelector renders a <fieldset> with <legend> for each taxonomy.
    // Verify both panels are present in the editor before interacting.
    const categoriesFieldset = page.getByRole("group", { name: /categories/i });
    const tagsFieldset = page.getByRole("group", { name: /tags/i });
    await expect(categoriesFieldset).toBeVisible({ timeout: 5000 });
    await expect(tagsFieldset).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(800);

    // ── Sprint 3: TaxonomySelector loads categories from API ─────────────────
    // When the stack is running in demo mode (VITE_USE_MSW=false), TaxonomySelector
    // fetches GET /wp/v2/categories from the real backend. In MSW mode the handler
    // returns mock data. Either way: wait for at least one checkbox to appear inside
    // the Categories fieldset, confirming the data round-trip completed.
    // Backend TODO: categories not yet persisted to posts — visible in UI only.
    const firstCategoryCheckbox = categoriesFieldset
      .getByRole("checkbox")
      .first();
    await expect(firstCategoryCheckbox).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(600);

    // ── Sprint 3: Select first category before creating the post ─────────────
    // Demonstrates the TaxonomySelector checkbox interaction in the video.
    // The category id is included in the POST payload (backend silently ignores
    // it until #56 lands, but the UI interaction is the demo point).
    await firstCategoryCheckbox.check();
    await expect(firstCategoryCheckbox).toBeChecked();
    await page.waitForTimeout(800);

    // ── 6. Submit → POST /wp/v2/posts → hook mutates title + content ──────────
    await page.getByRole("button", { name: /^create$/i }).click();

    // ── 7. Toast success ──────────────────────────────────────────────────────
    await expect(page.getByText(/post created/i)).toBeVisible();
    await page.waitForTimeout(800);

    // ── 8. Editor auto-redirects to #posts/:id/edit on create success ─────────
    // PostEditorPage handles success with window.location.hash = "posts/:id/edit".
    // Wait for the URL + heading to stabilize.
    await page.waitForURL(/#posts\/\d+\/edit/, { timeout: 5000 });
    await page.waitForTimeout(800);

    // ── Sprint 3: TaxonomySelector visible in edit mode too ──────────────────
    // After redirect to #posts/:id/edit the editor re-mounts. Both taxonomy
    // selectors should still be present, confirming TaxonomySelector works in
    // both new-post and edit-post contexts.
    await expect(page.getByRole("group", { name: /categories/i })).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByRole("group", { name: /tags/i })).toBeVisible({
      timeout: 5000,
    });
    await page.waitForTimeout(600);

    // ── 9. Verify hook mutation: title input has [DEMO] prefix ────────────────
    // pre_save_post filter mutates "Hello from demo" → "[DEMO] Hello from demo"
    await expect(page.getByLabel(/title/i)).toHaveValue(
      new RegExp(`\\[DEMO\\] ${demoTitle}`, "i"),
      { timeout: 5000 },
    );
    await page.waitForTimeout(1200);

    // ── 10. Verify content shows footer from the_content hook ─────────────────
    // the_content filter appends <footer>Powered by NodePress</footer>
    // The PostEditorPage pre-fills content from GET /wp/v2/posts/:id
    const contentTextarea = page.getByLabel(/content/i);
    await expect(contentTextarea).toHaveValue(/Powered by NodePress/i, {
      timeout: 5000,
    });

    // Make the footer visually obvious in the video:
    // 1. Scroll the textarea into view.
    // 2. Focus it and move the caret to the end so the <footer> tag is on screen.
    // 3. Select the text "Powered by NodePress" so the viewer's eye catches it.
    await contentTextarea.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await contentTextarea.focus();
    await page.keyboard.press("End"); // caret at end of current line
    await page.keyboard.press("Meta+End"); // macOS: jump to end of textarea
    await page.waitForTimeout(800);

    // Programmatically select the "Powered by NodePress" substring inside the textarea
    await contentTextarea.evaluate((el) => {
      const ta = el as HTMLTextAreaElement;
      const value = ta.value;
      const idx = value.indexOf("Powered by NodePress");
      if (idx >= 0) {
        ta.setSelectionRange(idx, idx + "Powered by NodePress".length);
      }
    });

    // Hold the final frame long enough for a viewer to read the footer.
    await page.waitForTimeout(3500);

    // ── PUBLIC SITE STEPS (pending-carmen) ───────────────────────────────────
    // These steps depend on Carmen's public-facing handlers:
    //   GET /        → HTML home with list of published posts
    //   GET /p/:slug → HTML individual post page
    // Both routes apply the_content hook → footer appears in public view.
    //
    // STATUS: pending-carmen — handlers not yet merged. Do NOT run this spec
    // until Carmen's public routes are in main. Selectors below are written
    // against the expected HTML structure. Adjust if Carmen's output differs.
    // Playwright config baseURL is :5173 (admin). The gotos below use absolute
    // URLs to :3000 — this is intentional and valid (no cross-origin restriction
    // in Playwright for page.goto with absolute URLs). CORS is permissive on the
    // backend (origin: true) so XHR/fetch from :5173 → :3000 is also fine.

    // ── 11. Open public home page — show the new post in the blog ────────────
    await page.goto("http://localhost:3000/");
    // Carmen's home renders an <h1> with the site name (NodePress).
    // Use exact match to avoid ambiguity with post titles like "Welcome to NodePress".
    await expect(
      page.getByRole("heading", { name: "NodePress", exact: true, level: 1 }),
    ).toBeVisible();
    await page.waitForTimeout(1200); // let viewer read the home

    // ── 12. Scroll to our demo post in the list + hold ────────────────────────
    // Carmen renders posts as <a> links with the post title as link text.
    // The hook has mutated the title → "[DEMO] Hello from demo <timestamp>".
    const demoLink = page.getByRole("link", {
      name: new RegExp(`\\[DEMO\\] ${demoTitle}`, "i"),
    });
    await demoLink.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // ── 13. Click the demo post → opens its individual public page ────────────
    await demoLink.click();
    await page.waitForURL(/\/p\/.+/);
    await page.waitForTimeout(800);

    // ── 14. Assert public page: mutated title + NodePress footer ─────────────
    // Carmen's post page renders the title in <h1> and applies the_content
    // hook → <footer>Powered by NodePress</footer> appears in the page body.
    await expect(
      page.getByRole("heading", {
        name: new RegExp(`\\[DEMO\\] ${demoTitle}`, "i"),
      }),
    ).toBeVisible();
    await expect(page.getByText(/Powered by NodePress/i).first()).toBeVisible();
    // Hold the final frame — this is the punchline of the demo.
    await page.waitForTimeout(3500);
  });
});
