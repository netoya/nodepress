import { defineConfig, devices } from "@playwright/test";

/**
 * playwright.demo.config.ts — Demo recording configuration.
 *
 * PREREQUISITES (run before this config):
 *   Terminal 1: NODEPRESS_DEMO_MODE=true npm run dev            (backend at :3000)
 *   Terminal 2: cd admin && VITE_USE_MSW=false VITE_API_URL=http://localhost:3000 npm run dev  (admin at :5173)
 *   Or use the one-shot script: ./scripts/record-demo-video.sh
 *
 * This config does NOT start a web server — it assumes the full stack is already running.
 * Run with: cd admin && npx playwright test --config=playwright.demo.config.ts
 */
export default defineConfig({
  testDir: "./e2e/demo",
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-demo", open: "never" }],
  ],
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
    // Do NOT block service workers for demo — real backend, no MSW
    video: { mode: "on", size: { width: 1280, height: 720 } },
    trace: "on",
  },
  projects: [
    {
      name: "chromium-demo",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // webServer intentionally omitted.
  // Requires backend at :3000 with NODEPRESS_DEMO_MODE=true
  // and admin at :5173 with VITE_USE_MSW=false.
  // Run `npm run demo:video:stack` (two terminals) first, then execute this config.
});
