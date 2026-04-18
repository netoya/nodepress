import { test, expect } from "@playwright/test";

test.setTimeout(60_000);

const threePosts = [
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
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    slug: "getting-started",
    status: "publish",
    title: { rendered: "Getting Started" },
    content: { rendered: "" },
    author: 1,
    _nodepress: { type: "post", menu_order: 1, meta: {} },
  },
  {
    id: 3,
    date: "2026-04-17T08:00:00.000Z",
    slug: "third-post",
    status: "publish",
    title: { rendered: "Third Post" },
    content: { rendered: "" },
    author: 1,
    _nodepress: { type: "post", menu_order: 2, meta: {} },
  },
];

test.describe("Dashboard — accessibility", () => {
  test("data state: post items exist and heading hierarchy is correct", async ({
    page,
  }) => {
    await page.route("**/wp/v2/posts**", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        body: JSON.stringify(threePosts),
      });
    });
    await page.goto("/");

    // h1 exists in the page (DashboardHeader renders the title)
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);

    // Posts render as <li> elements inside <ul aria-label="Posts">
    const postItems = page.locator('ul[aria-label="Posts"] li');
    await expect(postItems).toHaveCount(3);
  });

  test("loading state: role=status is present", async ({ page }) => {
    await page.route("**/wp/v2/posts**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        body: JSON.stringify([]),
      });
    });

    const gotoPromise = page.goto("/", { waitUntil: "commit" });
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });
    await gotoPromise;
  });

  test("empty state: CTA button is keyboard reachable", async ({ page }) => {
    await page.route("**/wp/v2/posts**", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        body: JSON.stringify([]),
      });
    });
    await page.goto("/");

    // CTA must be visible and reachable via keyboard (not tabindex=-1)
    const cta = page.getByRole("button", { name: /create first post/i });
    await expect(cta).toBeVisible();

    // Verify the button itself is in the tab order (not tabindex=-1)
    const tabIndex = await cta.getAttribute("tabindex");
    expect(tabIndex).not.toBe("-1");

    // Verify button can receive programmatic focus
    await cta.focus();
    await expect(cta).toBeFocused();
  });

  test("error state: role=alert is present and retry button is focusable", async ({
    page,
  }) => {
    const state = { allowSuccess: false };

    await page.route("**/wp/v2/posts**", (route) => {
      if (state.allowSuccess) {
        void route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
          body: JSON.stringify([]),
        });
      } else {
        void route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ code: "internal_error" }),
        });
      }
    });

    // Prevent React Query refetchOnWindowFocus from clearing error state prematurely
    await page.addInitScript(() => {
      const noop = (e: Event) => e.stopImmediatePropagation();
      window.addEventListener("visibilitychange", noop, true);
      window.addEventListener("focus", noop, true);
    });

    await page.goto("/");

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });

    const retryButton = page.getByRole("button", {
      name: /retry loading posts/i,
    });
    await expect(retryButton).toBeVisible({ timeout: 5000 });

    // Ensure retry button can receive keyboard focus
    await retryButton.focus();
    await expect(retryButton).toBeFocused();
  });
});
