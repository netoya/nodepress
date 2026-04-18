import { test, expect } from "@playwright/test";

const mockPosts = [
  {
    id: 1,
    date: "2026-04-15T10:00:00.000Z",
    modified: "2026-04-15T12:00:00.000Z",
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello World" },
    content: { rendered: "<p>Welcome to NodePress.</p>" },
    excerpt: { rendered: "Welcome to NodePress." },
    author: 1,
    _nodepress: { type: "post", menu_order: 0, meta: {} },
  },
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    modified: "2026-04-16T09:30:00.000Z",
    slug: "getting-started",
    status: "publish",
    title: { rendered: "Getting Started with NodePress" },
    content: { rendered: "<p>A guide to NodePress setup.</p>" },
    excerpt: { rendered: "A guide to NodePress setup." },
    author: 1,
    _nodepress: { type: "post", menu_order: 1, meta: {} },
  },
  {
    id: 3,
    date: "2026-04-17T08:00:00.000Z",
    modified: "2026-04-17T08:15:00.000Z",
    slug: "wordpress-compatibility",
    status: "publish",
    title: { rendered: "WordPress Compatibility Layer" },
    content: {
      rendered: "<p>How NodePress achieves WP API compatibility.</p>",
    },
    excerpt: { rendered: "How NodePress achieves WP API compatibility." },
    author: 1,
    _nodepress: { type: "post", menu_order: 2, meta: {} },
  },
];

test.describe("Dashboard — data state", () => {
  test("renders 3 posts with correct titles", async ({ page }) => {
    await page.route("**/wp/v2/posts**", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: {
          "X-WP-Total": "3",
          "X-WP-TotalPages": "1",
        },
        body: JSON.stringify(mockPosts),
      });
    });

    await page.goto("/");

    // Posts render as <li> items inside a <ul role="list" aria-label="Posts">
    // Each post shows its title as an h2
    await expect(page.getByText("Hello World")).toBeVisible();
    await expect(
      page.getByText("Getting Started with NodePress"),
    ).toBeVisible();
    await expect(page.getByText("WordPress Compatibility Layer")).toBeVisible();

    // Verify 3 post items in the list
    const postItems = page.locator('ul[aria-label="Posts"] li');
    await expect(postItems).toHaveCount(3);

    await expect(page).toHaveScreenshot("dashboard-data.png");
  });
});
