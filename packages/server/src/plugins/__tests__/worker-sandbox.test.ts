import { describe, it, expect } from "vitest";
import { runInWorkerSandbox } from "../worker-sandbox.js";

describe("runInWorkerSandbox", () => {
  it("executes clean plugin code without error", async () => {
    const pluginCode = `
      // Simple synchronous code
      const result = 1 + 1;
    `;

    const globals: Record<string, unknown> = {};

    // Should complete without error
    await expect(
      runInWorkerSandbox(pluginCode, globals),
    ).resolves.not.toThrow();
  });

  it("propagates plugin errors correctly", async () => {
    const pluginCode = `
      throw new Error("Test error from plugin");
    `;

    const globals: Record<string, unknown> = {};

    await expect(runInWorkerSandbox(pluginCode, globals)).rejects.toThrow(
      "Test error from plugin",
    );
  });

  it("times out if plugin exceeds timeout limit", async () => {
    const pluginCode = `
      // Busy wait for longer than timeout
      const start = Date.now();
      while (Date.now() - start < 1000) {
        // Keep CPU busy
      }
    `;

    const globals: Record<string, unknown> = {};

    // Set a very short timeout (100ms) and expect timeout
    await expect(
      runInWorkerSandbox(pluginCode, globals, { timeoutMs: 100 }),
    ).rejects.toThrow(/timeout/i);
  });

  it("terminates infinite loop on timeout", async () => {
    const pluginCode = `
      // Infinite loop
      while (true) {
        // Worker should be killed before reaching here
      }
    `;

    const globals: Record<string, unknown> = {};

    // Set a short timeout
    await expect(
      runInWorkerSandbox(pluginCode, globals, { timeoutMs: 200 }),
    ).rejects.toThrow(/timeout/i);
  });

  it("handles async operations in plugin code", async () => {
    const pluginCode = `
      // Simulate async initialization with top-level await
      // Create a resolved promise and await it
      await Promise.resolve(42);
    `;

    const globals: Record<string, unknown> = {};

    // Should complete without error (async handling in worker code)
    await expect(
      runInWorkerSandbox(pluginCode, globals, { timeoutMs: 5000 }),
    ).resolves.not.toThrow();
  });

  // Memory limit test is commented out as per spec: requires manual testing
  // to allocate > 32MB. Uncomment only for manual/stress testing.
  /*
  it("enforces memory limit and kills worker on OOM", async () => {
    const pluginCode = `
      // Attempt to allocate 64MB (exceeds default 32MB limit)
      const buffer = Buffer.alloc(64 * 1024 * 1024);
    `;

    const globals: Record<string, unknown> = {};

    // Should fail with memory-related error or worker termination
    await expect(
      runInWorkerSandbox(pluginCode, globals, { maxMemoryMb: 32 }),
    ).rejects.toThrow(/(OOM|memory|Worker exited)/i);
  });
  */
});
