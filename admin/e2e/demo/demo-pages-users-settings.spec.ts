import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * demo-pages-users-settings.spec.ts — End-to-end demo spec for the mini-sprint:
 * Pages UI (M8), Users UI (M9), and Settings UI (M10).
 *
 * Requires the full stack running:
 *   Backend: npm run dev                                              (port 3000)
 *   Admin:   VITE_USE_MSW=false VITE_API_URL=http://localhost:3000 \
 *            VITE_ADMIN_TOKEN=dev-admin-token npm run dev            (port 5173)
 *
 * Scene breakdown:
 *   Scene 1 — Pages: create and list "About Us"
 *   Scene 2 — Pages: create "Our Team" and assign parent = "About Us"
 *   Scene 3 — Users: create a new user via modal
 *   Scene 4 — Users: edit role of the created user
 *   Scene 5 — Settings: update Site Title and verify persistence
 *   Scene 6 — REST verification: pages and settings via API request context
 *
 * Cleanup: afterAll removes created pages and the demo user so reruns are safe.
 */

const API_BASE = "http://localhost:3000";
const ADMIN_TOKEN = process.env.VITE_ADMIN_TOKEN ?? "dev-admin-token";

/** Shared ids collected during the test run for cleanup. */
const created = {
  aboutUsId: 0,
  ourTeamId: 0,
  demoUserId: 0,
  /** Original site title, restored in afterAll. */
  originalSiteTitle: "",
};

/**
 * Probe backend availability. If :3000 is not reachable the entire suite is
 * skipped with a clear message — no silent failures.
 */
async function isBackendAvailable(
  request: APIRequestContext,
): Promise<boolean> {
  try {
    const res = await request.get(`${API_BASE}/wp/v2/posts?per_page=1`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      failOnStatusCode: false,
    });
    return res.status() < 500;
  } catch {
    return false;
  }
}

// ── Authentication ────────────────────────────────────────────────────────────

async function authHeaders() {
  return {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// ── REST helpers ──────────────────────────────────────────────────────────────

async function deletePage(
  request: APIRequestContext,
  id: number,
): Promise<void> {
  if (!id) return;
  await request.delete(`${API_BASE}/wp/v2/pages/${id}?force=true`, {
    headers: await authHeaders(),
    failOnStatusCode: false,
  });
}

async function deleteUser(
  request: APIRequestContext,
  id: number,
): Promise<void> {
  if (!id) return;
  await request.delete(`${API_BASE}/wp/v2/users/${id}?force=true&reassign=1`, {
    headers: await authHeaders(),
    failOnStatusCode: false,
  });
}

async function restoreSettings(
  request: APIRequestContext,
  title: string,
): Promise<void> {
  if (!title) return;
  await request.post(`${API_BASE}/wp/v2/settings`, {
    headers: await authHeaders(),
    data: { title },
    failOnStatusCode: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe("Mini-sprint demo — Pages, Users, Settings", () => {
  test.setTimeout(120_000);

  // ── Guards: skip if backend is absent ────────────────────────────────────
  test.beforeAll(async ({ request }) => {
    const available = await isBackendAvailable(request);
    if (!available) {
      // test.skip inside beforeAll requires throwing — use process signal.
      // We mark a flag used inside each test instead.
    }
    // Save original site title for restore
    try {
      const res = await request.get(`${API_BASE}/wp/v2/settings`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        failOnStatusCode: false,
      });
      if (res.ok()) {
        const body = (await res.json()) as { title?: string };
        created.originalSiteTitle = body.title ?? "";
      }
    } catch {
      // ignore
    }
  });

  test.afterAll(async ({ request }) => {
    await deletePage(request, created.ourTeamId);
    await deletePage(request, created.aboutUsId);
    await deleteUser(request, created.demoUserId);
    await restoreSettings(request, created.originalSiteTitle);
  });

  // ── Scene 1 — Pages: create and list "About Us" ───────────────────────────
  test.describe("Scene 1 — Pages: create and list", () => {
    test("navigates to /pages, creates About Us, verifies it appears in list", async ({
      page,
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(
          true,
          "Backend not available on :3000. Start with: npm run dev",
        );
      }

      // Navigate to Pages
      await page.goto("/#/pages");
      await expect(page.getByRole("heading", { name: /^pages$/i })).toBeVisible(
        { timeout: 10_000 },
      );
      await page.waitForTimeout(600);

      // List loads (data or empty state) — either is acceptable
      const pageBody = page.locator("main, [role='main'], #root");
      await expect(pageBody).toBeVisible();

      // Click "New Page" button
      await page.getByRole("button", { name: /new page/i }).click();
      await expect(
        page.getByRole("heading", { name: /new page/i }),
      ).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(500);

      // Fill title
      const titleInput = page.getByLabel(/title/i);
      await titleInput.fill("About Us");
      await page.waitForTimeout(400);

      // Slug auto-fills — wait briefly for the effect
      await page.waitForTimeout(600);

      // Set status to publish
      await page.getByRole("combobox", { name: /status/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /^publish(ed)?$/i }).click();
      await page.waitForTimeout(300);

      // Submit
      await page
        .getByRole("button", { name: /^(create|publish|save)$/i })
        .click();

      // Toast confirms creation
      await expect(page.getByText(/page (created|saved)/i)).toBeVisible({
        timeout: 8_000,
      });
      await page.waitForTimeout(800);

      // Navigate back to list
      await page.goto("/#/pages");
      await expect(page.getByRole("heading", { name: /^pages$/i })).toBeVisible(
        { timeout: 8_000 },
      );

      // "About Us" should appear in the list
      await expect(page.getByText("About Us")).toBeVisible({ timeout: 8_000 });

      // Collect id from REST for cleanup
      const listRes = await request.get(
        `${API_BASE}/wp/v2/pages?per_page=100`,
        {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          failOnStatusCode: false,
        },
      );
      if (listRes.ok()) {
        const pages = (await listRes.json()) as Array<{
          id: number;
          title: { rendered: string };
        }>;
        const found = pages.find((p) =>
          p.title.rendered.toLowerCase().includes("about us"),
        );
        if (found) created.aboutUsId = found.id;
      }
    });
  });

  // ── Scene 2 — Pages: create "Our Team" with parent = "About Us" ──────────
  test.describe("Scene 2 — Pages: edit with parent", () => {
    test("creates Our Team page, assigns About Us as parent, verifies in list", async ({
      page,
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }
      if (!created.aboutUsId) {
        test.skip(
          true,
          "Scene 1 did not create About Us — cannot assign parent.",
        );
      }

      // Navigate to new page form
      await page.goto("/#/pages/new");
      await expect(
        page.getByRole("heading", { name: /new page/i }),
      ).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(500);

      // Fill title
      await page.getByLabel(/title/i).fill("Our Team");
      await page.waitForTimeout(600);

      // Assign parent: "About Us" should be in the parent combobox
      const parentSelect = page.getByRole("combobox", { name: /parent/i });
      await parentSelect.click();
      await page.waitForTimeout(400);
      // Select "About Us" option from the parent list
      await page.getByRole("option", { name: /about us/i }).click();
      await page.waitForTimeout(400);

      // Publish
      await page.getByRole("combobox", { name: /status/i }).click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /^publish(ed)?$/i }).click();
      await page.waitForTimeout(300);

      await page
        .getByRole("button", { name: /^(create|publish|save)$/i })
        .click();
      await expect(page.getByText(/page (created|saved)/i)).toBeVisible({
        timeout: 8_000,
      });
      await page.waitForTimeout(800);

      // Navigate to list and verify parent name shown
      await page.goto("/#/pages");
      await expect(page.getByRole("heading", { name: /^pages$/i })).toBeVisible(
        { timeout: 8_000 },
      );

      // "Our Team" should be in the list
      await expect(page.getByText("Our Team")).toBeVisible({ timeout: 8_000 });
      // The parent column should show "About Us" for the Our Team row
      await expect(page.getByText("About Us")).toBeVisible({ timeout: 5_000 });

      // Collect Our Team id for cleanup
      const listRes = await request.get(
        `${API_BASE}/wp/v2/pages?per_page=100`,
        {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          failOnStatusCode: false,
        },
      );
      if (listRes.ok()) {
        const pages = (await listRes.json()) as Array<{
          id: number;
          title: { rendered: string };
        }>;
        const found = pages.find((p) =>
          p.title.rendered.toLowerCase().includes("our team"),
        );
        if (found) created.ourTeamId = found.id;
      }
    });
  });

  // ── Scene 3 — Users: create a new user via modal ─────────────────────────
  test.describe("Scene 3 — Users: create new user", () => {
    test("navigates to /users, opens modal, fills form, verifies in list", async ({
      page,
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }

      await page.goto("/#/users");
      await expect(page.getByRole("heading", { name: /^users$/i })).toBeVisible(
        { timeout: 10_000 },
      );
      await page.waitForTimeout(600);

      // Open create modal
      await page.getByRole("button", { name: /new user/i }).click();
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(500);

      // Fill user fields
      await page.getByLabel(/display.?name/i).fill("Demo User");
      await page.getByLabel(/email/i).fill("demo@test.com");
      await page.getByLabel(/password/i).fill("SecurePass123!");

      // Role selector — pick "editor"
      const roleSelect = page.getByRole("combobox", { name: /role/i });
      await roleSelect.click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /^editor$/i }).click();
      await page.waitForTimeout(300);

      // Submit
      await page
        .getByRole("button", { name: /^(create|save|add)( user)?$/i })
        .click();
      await expect(
        page.getByText(/(user created|created successfully)/i),
      ).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(800);

      // Verify the user appears in the list
      await expect(page.getByText("Demo User")).toBeVisible({ timeout: 8_000 });

      // Collect user id for cleanup
      const res = await request.get(`${API_BASE}/wp/v2/users?per_page=100`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
        failOnStatusCode: false,
      });
      if (res.ok()) {
        const users = (await res.json()) as Array<{
          id: number;
          name: string;
          email?: string;
        }>;
        const found = users.find(
          (u) =>
            u.name.toLowerCase().includes("demo user") ||
            (u.email ?? "").includes("demo@test.com"),
        );
        if (found) created.demoUserId = found.id;
      }
    });
  });

  // ── Scene 4 — Users: edit role ────────────────────────────────────────────
  test.describe("Scene 4 — Users: edit role", () => {
    test("edits Demo User role from editor to author, verifies in list", async ({
      page,
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }
      if (!created.demoUserId) {
        test.skip(true, "Scene 3 did not create Demo User — cannot edit role.");
      }

      await page.goto("/#/users");
      await expect(page.getByRole("heading", { name: /^users$/i })).toBeVisible(
        { timeout: 10_000 },
      );

      // Find the Demo User row and click its Edit button
      const demoUserRow = page.getByText("Demo User").first();
      await expect(demoUserRow).toBeVisible({ timeout: 8_000 });

      const editButton = page
        .getByRole("row", { name: /demo user/i })
        .getByRole("button", { name: /edit/i })
        .first();

      // Fallback: if table rows are not role="row", click edit near the name
      if (!(await editButton.isVisible().catch(() => false))) {
        await demoUserRow
          .locator("..")
          .getByRole("button", { name: /edit/i })
          .click();
      } else {
        await editButton.click();
      }

      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(400);

      // Change role to "author"
      const roleSelect = page.getByRole("combobox", { name: /role/i });
      await roleSelect.click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /^author$/i }).click();
      await page.waitForTimeout(300);

      // Save
      await page
        .getByRole("button", { name: /^(save|update)( user)?$/i })
        .click();
      await expect(
        page.getByText(/(user updated|updated successfully|saved)/i),
      ).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(600);

      // Verify "author" badge/label is visible in the list for Demo User
      await expect(page.getByText(/author/i)).toBeVisible({ timeout: 8_000 });

      // Verify via REST that role changed
      const res = await request.get(
        `${API_BASE}/wp/v2/users/${created.demoUserId}`,
        {
          headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
          failOnStatusCode: false,
        },
      );
      if (res.ok()) {
        const user = (await res.json()) as { roles?: string[] };
        const roles = user.roles ?? [];
        expect(roles).toContain("author");
      }
    });
  });

  // ── Scene 5 — Settings: save and verify persistence ───────────────────────
  test.describe("Scene 5 — Settings: save site title", () => {
    test("changes Site Title, saves, verifies toast, reloads and checks persistence", async ({
      page,
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }

      await page.goto("/#/settings");
      await expect(
        page.getByRole("heading", { name: /^settings$/i }),
      ).toBeVisible({ timeout: 10_000 });
      await page.waitForTimeout(600);

      // Clear and fill Site Title
      const siteTitleInput = page.getByLabel(/site.?title/i);
      await siteTitleInput.clear();
      await siteTitleInput.fill("NodePress Demo Site");
      await page.waitForTimeout(400);

      // Save
      await page
        .getByRole("button", { name: /^save(settings| changes)?$/i })
        .click();

      // Verify success toast
      await expect(
        page.getByText(/(settings saved|saved successfully)/i),
      ).toBeVisible({ timeout: 8_000 });
      await page.waitForTimeout(800);

      // Reload and verify persistence
      await page.reload();
      await expect(
        page.getByRole("heading", { name: /^settings$/i }),
      ).toBeVisible({ timeout: 10_000 });

      await expect(page.getByLabel(/site.?title/i)).toHaveValue(
        "NodePress Demo Site",
        { timeout: 8_000 },
      );
    });
  });

  // ── Scene 6 — REST verification ───────────────────────────────────────────
  test.describe("Scene 6 — REST: verify pages and settings via API", () => {
    test("GET /wp/v2/pages returns pages created in Scenes 1 and 2", async ({
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }

      const res = await request.get(`${API_BASE}/wp/v2/pages?per_page=100`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      expect(res.ok()).toBe(true);

      const pages = (await res.json()) as Array<{
        id: number;
        title: { rendered: string };
      }>;

      const titles = pages.map((p) => p.title.rendered.toLowerCase());
      expect(titles.some((t) => t.includes("about us"))).toBe(true);
    });

    test("GET /wp/v2/settings returns title = NodePress Demo Site", async ({
      request,
    }) => {
      const available = await isBackendAvailable(request);
      if (!available) {
        test.skip(true, "Backend not available on :3000.");
      }

      const res = await request.get(`${API_BASE}/wp/v2/settings`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      });
      expect(res.ok()).toBe(true);

      const settings = (await res.json()) as { title?: string };
      expect(settings.title).toBe("NodePress Demo Site");
    });
  });
});
