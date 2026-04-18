/// <reference types="vite/client" />

/**
 * MSW worker bootstrap for dev mode.
 * Call startMswWorker() before rendering the React tree.
 * No-ops in production (import.meta.env.DEV guard).
 */
export async function startMswWorker(): Promise<void> {
  if (!import.meta.env.DEV) return;

  const { worker } = await import("./browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}
