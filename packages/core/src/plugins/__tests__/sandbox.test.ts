import { describe, it, expect, vi } from "vitest";
import { runInSandbox } from "../sandbox.js";
import { createHookRegistry } from "../../hooks/HookRegistry.js";
import { DisposableRegistryImpl } from "../../hooks/context.js";

describe("Sandbox", () => {
  it("executes a plugin function without error", async () => {
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const pluginFn = vi.fn(async (hooks: any, _ctx: any) => {
      hooks.addFilter("test", {
        pluginId: "sandbox-test",
        priority: 10,
        type: "filter",
        fn: (val: unknown) => val,
      });
    });

    await runInSandbox(pluginFn, registry, context);

    expect(pluginFn).toHaveBeenCalledWith(registry, context);
    expect(registry.hasFilter("test")).toBe(true);
  });

  it("throws error when plugin exceeds timeout", async () => {
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const pluginFn = async () => {
      // Simulate a plugin that takes longer than the timeout
      await new Promise(() => {}); // Never resolves
    };

    await expect(
      runInSandbox(pluginFn, registry, context, 100), // 100ms timeout
    ).rejects.toThrow(/timeout/i);
  });

  it("handles plugin errors gracefully", async () => {
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const pluginFn = () => {
      throw new Error("Plugin initialization failed");
    };

    await expect(runInSandbox(pluginFn, registry, context)).rejects.toThrow(
      "Plugin initialization failed",
    );
  });

  it("handles plugin async errors gracefully", async () => {
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const pluginFn = async () => {
      await Promise.resolve();
      throw new Error("Plugin async error");
    };

    await expect(runInSandbox(pluginFn, registry, context)).rejects.toThrow(
      "Plugin async error",
    );
  });

  it("supports sync plugin functions", async () => {
    const registry = createHookRegistry();
    const context = new DisposableRegistryImpl() as any;

    const pluginFn = (hooks: any) => {
      hooks.addFilter("sync-test", {
        pluginId: "sync-plugin",
        priority: 10,
        type: "filter",
        fn: (val: string) => val + "_modified",
      });
    };

    await runInSandbox(pluginFn, registry, context);

    expect(registry.hasFilter("sync-test")).toBe(true);
  });
});
