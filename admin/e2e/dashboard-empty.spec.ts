import { test, expect } from "@playwright/test";
import { disableMsw } from "./helpers/disable-msw";

test.describe("Dashboard — empty state", () => {
  test("shows EmptyState with CTA when no posts exist", async ({ page }) => {
    await disableMsw(page);

    await page.route("**/wp/v2/posts**", (route) => {
      void route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        body: JSON.stringify([]),
      });
    });

    await page.goto("/");

    // DashboardEmpty renders "Create first post" CTA button
    await expect(page.getByText("Create first post")).toBeVisible();

    await expect(page).toHaveScreenshot("dashboard-empty.png");
  });
});
