import { test, expect } from "@playwright/test";

const recoveredPosts = [
  {
    id: 1,
    date: "2026-04-15T10:00:00.000Z",
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello World" },
    content: { rendered: "<p>Welcome to NodePress.</p>" },
    author: 1,
    _nodepress: { type: "post", menu_order: 0, meta: {} },
  },
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    slug: "getting-started",
    status: "publish",
    title: { rendered: "Getting Started with NodePress" },
    content: { rendered: "<p>A guide to NodePress setup.</p>" },
    author: 1,
    _nodepress: { type: "post", menu_order: 1, meta: {} },
  },
];

test.setTimeout(60_000);

test.describe("Dashboard — error state + retry", () => {
  test("shows error alert, retries, then shows posts", async ({ page }) => {
    // allowSuccess gates when the route returns 200.
    // Starts false — all requests fail until we explicitly allow success.
    const state = { allowSuccess: false };

    await page.route("**/wp/v2/posts**", (route) => {
      if (state.allowSuccess) {
        void route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" },
          body: JSON.stringify(recoveredPosts),
        });
      } else {
        void route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "internal_error",
            message: "Server error",
          }),
        });
      }
    });

    // Prevent React Query's refetchOnWindowFocus from triggering spurious refetches
    // during Playwright interactions (screenshot, focus changes, etc.)
    await page.addInitScript(() => {
      // Suppress visibilitychange and focus events that React Query uses for refetchOnWindowFocus
      const noop = (e: Event) => e.stopImmediatePropagation();
      window.addEventListener("visibilitychange", noop, true);
      window.addEventListener("focus", noop, true);
    });

    await page.goto("/");

    // Error state: DashboardError renders role="alert"
    // React Query exhausts initial request + 1 auto-retry before showing error
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });

    // Screenshot: error state
    await expect(page).toHaveScreenshot("dashboard-error.png");

    // Allow success on all future requests, then click retry
    state.allowSuccess = true;
    // Brief settle — React Query may run a background refetch from window focus events
    await page.waitForTimeout(500);

    const retryButton = page.getByRole("button", {
      name: /retry loading posts/i,
    });
    await expect(retryButton).toBeVisible({ timeout: 5000 });
    await retryButton.click({ force: true, timeout: 10_000 });

    // Posts appear after recovery
    await expect(page.getByText("Hello World")).toBeVisible({
      timeout: 10_000,
    });
    const postItems = page.locator('ul[aria-label="Posts"] li');
    await expect(postItems).toHaveCount(2);

    // Screenshot: recovered state
    await expect(page).toHaveScreenshot("dashboard-error-recovered.png");
  });
});
