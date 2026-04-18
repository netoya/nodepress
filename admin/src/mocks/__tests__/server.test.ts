import { describe, it, expect, vi, afterEach } from "vitest";

describe("startMswWorker — VITE_USE_MSW flag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("resolves immediately (no error) when VITE_USE_MSW is 'false'", async () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_USE_MSW", "false");

    // Re-import after stubbing env so the module sees updated values.
    // The function should return early before importing ./browser (which
    // requires a real service worker environment and would throw in jsdom).
    const { startMswWorker } = await import("../server");
    await expect(startMswWorker()).resolves.toBeUndefined();
  });

  it("resolves immediately when not in DEV mode (first guard)", async () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_USE_MSW", "true");

    const { startMswWorker } = await import("../server");
    await expect(startMswWorker()).resolves.toBeUndefined();
  });
});
