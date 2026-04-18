import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadPlugins } from "../loader.js";
import { createHookRegistry } from "../../hooks/HookRegistry.js";
import { DisposableRegistryImpl } from "../../hooks/context.js";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Test fixture: create a temporary plugins directory with test modules.
 */
function createTempDir(): string {
  const tmpDir = path.join(__dirname, ".tmp-test-plugins");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  return tmpDir;
}

function cleanupTempDir(tmpDir: string): void {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe("PluginLoader", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tmpDir);
    vi.clearAllMocks();
  });

  it("returns empty array when plugin directory does not exist", async () => {
    const nonexistent = path.join(__dirname, ".tmp-nonexistent-dir");
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any; // cast for test

    const loaded = await loadPlugins(registry, context, nonexistent);

    expect(loaded).toEqual([]);
  });

  it("loads and activates a valid plugin from a .js file", async () => {
    // Create a mock plugin module
    const pluginCode = `
export default function register(hooks, context) {
  hooks.addFilter("test_filter", {
    pluginId: "test-plugin",
    priority: 10,
    type: "filter",
    fn: (val) => val + "_modified"
  });
}
`;
    const pluginPath = path.join(tmpDir, "test-plugin.js");
    fs.writeFileSync(pluginPath, pluginCode);

    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const loaded = await loadPlugins(registry, context, tmpDir);

    expect(loaded).toContain("test-plugin.js");
    expect(loaded.length).toBe(1);
    expect(registry.hasFilter("test_filter")).toBe(true);
  });

  it("omits plugins without a default export", async () => {
    // Create a plugin that does NOT export default
    const pluginCode = `
export const notDefault = () => {
  console.log("This is not the default export");
};
`;
    const pluginPath = path.join(tmpDir, "bad-plugin.js");
    fs.writeFileSync(pluginPath, pluginCode);

    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const loaded = await loadPlugins(registry, context, tmpDir);

    expect(loaded).not.toContain("bad-plugin.js");
    expect(loaded.length).toBe(0);
  });

  it("skips files that are not .js", async () => {
    fs.writeFileSync(path.join(tmpDir, "readme.txt"), "This is not a plugin");
    fs.writeFileSync(path.join(tmpDir, "data.json"), '{"key": "value"}');

    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const loaded = await loadPlugins(registry, context, tmpDir);

    expect(loaded.length).toBe(0);
  });

  it("continues loading after encountering a failing plugin", async () => {
    // Good plugin
    const goodPlugin = `
export default function register(hooks, context) {
  hooks.addFilter("good_filter", {
    pluginId: "good",
    priority: 10,
    type: "filter",
    fn: (val) => val
  });
}
`;
    fs.writeFileSync(path.join(tmpDir, "good.js"), goodPlugin);

    // Bad plugin that throws
    const badPlugin = `
export default function register(hooks, context) {
  throw new Error("Plugin load failed");
}
`;
    fs.writeFileSync(path.join(tmpDir, "bad.js"), badPlugin);

    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const loaded = await loadPlugins(registry, context, tmpDir);

    // Good plugin should load, bad should not
    expect(loaded).toContain("good.js");
    expect(loaded).not.toContain("bad.js");
    expect(registry.hasFilter("good_filter")).toBe(true);
  });

  it("respects NODEPRESS_PLUGINS_DIR environment variable", async () => {
    const pluginCode = `
export default function register(hooks, context) {
  hooks.addFilter("env_filter", {
    pluginId: "env-plugin",
    priority: 10,
    type: "filter",
    fn: (val) => val
  });
}
`;
    fs.writeFileSync(path.join(tmpDir, "env-plugin.js"), pluginCode);

    const originalEnv = process.env["NODEPRESS_PLUGINS_DIR"];
    process.env["NODEPRESS_PLUGINS_DIR"] = tmpDir;

    try {
      const registry = createHookRegistry();
      const context = new DisposableRegistryImpl() as any;

      // Call without specifying pluginsDir — should use env var
      const loaded = await loadPlugins(registry, context);

      expect(loaded).toContain("env-plugin.js");
    } finally {
      if (originalEnv === undefined) {
        delete process.env["NODEPRESS_PLUGINS_DIR"];
      } else {
        process.env["NODEPRESS_PLUGINS_DIR"] = originalEnv;
      }
    }
  });

  it("loads multiple plugins from the same directory", async () => {
    const plugin1 = `
export default function register(hooks, context) {
  hooks.addFilter("filter1", {
    pluginId: "plugin1",
    priority: 10,
    type: "filter",
    fn: (val) => val + "_p1"
  });
}
`;
    const plugin2 = `
export default function register(hooks, context) {
  hooks.addFilter("filter2", {
    pluginId: "plugin2",
    priority: 10,
    type: "filter",
    fn: (val) => val + "_p2"
  });
}
`;
    fs.writeFileSync(path.join(tmpDir, "plugin1.js"), plugin1);
    fs.writeFileSync(path.join(tmpDir, "plugin2.js"), plugin2);

    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const loaded = await loadPlugins(registry, context, tmpDir);

    expect(loaded).toContain("plugin1.js");
    expect(loaded).toContain("plugin2.js");
    expect(loaded.length).toBe(2);
    expect(registry.hasFilter("filter1")).toBe(true);
    expect(registry.hasFilter("filter2")).toBe(true);
  });
});
