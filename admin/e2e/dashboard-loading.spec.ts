import { test, expect } from "@playwright/test";
import { disableMsw } from "./helpers/disable-msw";

test.describe("Dashboard — loading state", () => {
  test("shows spinner while fetching", async ({ page }) => {
    await disableMsw(page);

    // Route with a 3s delay — capture skeleton before response
    await page.route("**/wp/v2/posts**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" },
        body: JSON.stringify([
          {
            id: 1,
            date: "2026-04-15T10:00:00.000Z",
            slug: "hello-world",
            status: "publish",
            title: { rendered: "Hello World" },
            content: { rendered: "" },
            author: 1,
            _nodepress: { type: "post", menu_order: 0, meta: {} },
          },
        ]),
      });
    });

    // Navigate without waiting for load — we want to see the skeleton
    const gotoPromise = page.goto("/", { waitUntil: "commit" });

    // The skeleton container has role="status" (DashboardSkeleton)
    const status = page.getByRole("status");
    await expect(status).toBeVisible({ timeout: 5000 });

    // Screenshot while skeleton is visible
    await expect(page).toHaveScreenshot("dashboard-loading.png");

    // Wait for navigation to fully complete
    await gotoPromise;
  });
});
