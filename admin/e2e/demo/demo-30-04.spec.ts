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
 *   4. Hook system proof: title gets [DEMO] prefix (pre_save_post filter)
 *   5. Hook system proof: content gets "Powered by NodePress" footer (the_content filter)
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

    // ── 5. Fill form ──────────────────────────────────────────────────────────
    await page.getByLabel(/title/i).fill("Hello from demo");
    await page.getByLabel(/content/i).fill("This content will get a footer.");
    await page.waitForTimeout(500);

    // ── 6. Submit → POST /wp/v2/posts → hook mutates title + content ──────────
    await page.getByRole("button", { name: /^create$/i }).click();

    // ── 7. Toast success ──────────────────────────────────────────────────────
    await expect(page.getByText(/post created/i)).toBeVisible();
    await page.waitForTimeout(800);

    // ── 8. Navigate back to Posts list ────────────────────────────────────────
    // After create, App redirects to #posts/:id/edit (edit mode).
    // Navigate back to list to see the mutated title.
    await page.goto("/#posts");
    await expect(page.getByRole("heading", { name: /^posts$/i })).toBeVisible();
    await page.waitForTimeout(500);

    // ── 9. Verify hook mutation: title has [DEMO] prefix ──────────────────────
    // pre_save_post filter mutates "Hello from demo" → "[DEMO] Hello from demo"
    await expect(page.getByText(/\[DEMO\] Hello from demo/i)).toBeVisible();
    await page.waitForTimeout(1200);

    // ── 10. Open the new post to view content ─────────────────────────────────
    // Click the Edit button for the new post (PostsTable renders an Edit button per row)
    const demoRow = page
      .locator("tr", { hasText: /\[DEMO\] Hello from demo/i })
      .first();
    await demoRow
      .getByRole("button", { name: /edit post.*hello from demo/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /edit post/i }),
    ).toBeVisible();
    await page.waitForTimeout(800);

    // ── 11. Content shows footer from the_content hook ────────────────────────
    // the_content filter appends <footer>Powered by NodePress</footer>
    // The PostEditorPage pre-fills content from GET /wp/v2/posts/:id
    await expect(page.getByLabel(/content/i)).toContainText(
      /Powered by NodePress/i,
    );
    await page.waitForTimeout(1500); // let viewer see it
  });
});
