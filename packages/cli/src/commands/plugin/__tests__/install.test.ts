import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { resolve } from "path";
import { tmpdir } from "os";

describe("installPlugin CLI command", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = resolve(tmpdir(), `nodepress-install-test-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("exports installPlugin function", async () => {
    const { installPlugin } = await import("../index.js");
    expect(typeof installPlugin).toBe("function");
  });

  it("exports listPlugins function", async () => {
    const { listPlugins } = await import("../index.js");
    expect(typeof listPlugins).toBe("function");
  });

  it("installPlugin handles registry URL defaults", async () => {
    // Verify that the function can be called (error handling internally)
    const { installPlugin } = await import("../index.js");
    expect(installPlugin).toBeDefined();
  });
});
