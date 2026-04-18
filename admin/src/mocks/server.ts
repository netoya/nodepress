/// <reference types="vite/client" />

/**
 * MSW worker bootstrap for dev mode.
 * Call startMswWorker() before rendering the React tree.
 * No-ops in production (import.meta.env.DEV guard).
 */
export async function startMswWorker(): Promise<void> {
  if (!import.meta.env.DEV) return;
  // Allow opting out of MSW to hit the real backend (e.g. demo mode)
  if (import.meta.env["VITE_USE_MSW"] === "false") return;

  const { worker } = await import("./browser");
  // Catch SW registration failures gracefully (e.g. when blocked by E2E test config)
  await worker
    .start({
      onUnhandledRequest: "bypass",
      serviceWorker: {
        url: "/mockServiceWorker.js",
      },
    })
    .catch(() => {
      // SW blocked or unavailable — app still renders, requests go to network
    });
}
