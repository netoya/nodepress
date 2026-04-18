import type { Page } from "@playwright/test";

/**
 * Disables MSW service worker during E2E tests.
 *
 * Strategy:
 * 1. Route mockServiceWorker.js to a script that immediately unregisters itself.
 * 2. Add an init script that unregisters any pre-existing SW registrations
 *    before the page finishes loading.
 *
 * Must be called before page.goto().
 */
export async function disableMsw(page: Page): Promise<void> {
  // Serve a SW that unregisters itself — prevents MSW from intercepting
  await page.route("**/mockServiceWorker.js**", (route) => {
    void route.fulfill({
      status: 200,
      contentType: "application/javascript",
      // This SW unregisters itself immediately upon install
      body: `
self.addEventListener('install', () => { self.skipWaiting(); });
self.addEventListener('activate', () => {
  self.registration.unregister();
  self.clients.claim();
});
`,
    });
  });

  // Also eagerly unregister any SW that's already active from prior sessions
  await page.addInitScript(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) {
          void reg.unregister();
        }
      });
    }
  });
}
