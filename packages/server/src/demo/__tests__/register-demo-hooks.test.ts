/**
 * Unit tests for `registerDemoHooks` — ensure the demo module wires both
 * canonical filters against a fresh HookRegistry and that the transformations
 * match the demo-30-04 contract.
 *
 * These are pure unit tests: they exercise the registry directly via
 * `applyFilters`, without a Fastify instance. The full end-to-end wiring
 * (HTTP → handler → registry) is covered by `demo-end-to-end.test.ts`.
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { HookRegistry } from "@nodepress/core";
import { createHookRegistry } from "@nodepress/core";
import { registerDemoHooks, DEMO_PLUGIN_ID } from "../register-demo-hooks.js";

describe("registerDemoHooks", () => {
  let registry: HookRegistry;

  beforeEach(() => {
    registry = createHookRegistry();
  });

  it("registers pre_save_post and the_content filters on the target registry", () => {
    expect(registry.hasFilter("pre_save_post")).toBe(false);
    expect(registry.hasFilter("the_content")).toBe(false);

    registerDemoHooks(registry);

    expect(registry.hasFilter("pre_save_post")).toBe(true);
    expect(registry.hasFilter("the_content")).toBe(true);
  });

  it("pre_save_post filter prepends [DEMO] to the title", () => {
    registerDemoHooks(registry);

    const result = registry.applyFilters<{ title: string; content: string }>(
      "pre_save_post",
      { title: "Hello", content: "World" },
    );

    expect(result.title).toBe("[DEMO] Hello");
    // Non-title fields must be preserved.
    expect(result.content).toBe("World");
  });

  it("the_content filter appends the NodePress footer to the content string", () => {
    registerDemoHooks(registry);

    const result = registry.applyFilters<string>("the_content", "Body copy");

    expect(result).toBe("Body copy<footer>Powered by NodePress</footer>");
  });

  it("removeAllByPlugin('demo-plugin') removes both filters in one call", () => {
    registerDemoHooks(registry);
    expect(registry.hasFilter("pre_save_post")).toBe(true);
    expect(registry.hasFilter("the_content")).toBe(true);

    registry.removeAllByPlugin(DEMO_PLUGIN_ID);

    expect(registry.hasFilter("pre_save_post")).toBe(false);
    expect(registry.hasFilter("the_content")).toBe(false);
  });
});
