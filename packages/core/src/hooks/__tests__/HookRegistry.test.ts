/**
 * HookRegistry test suite — covers the full contract defined in
 * `../types.ts` and the semantics pinned in ADR-005.
 *
 * Scope:
 *  - registration + ordering by priority (stable ties)
 *  - filter / action execution semantics (sync vs async)
 *  - error containment (resilience contract)
 *  - plugin teardown via `removeAllByPlugin`
 *  - idempotency across add → remove → add cycles
 *  - type-level regression of the ADR-005 asymmetry
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActionEntry, FilterEntry } from "../types.js";
import { DEFAULT_HOOK_PRIORITY } from "../types.js";
import { HookRegistryImpl, createHookRegistry } from "../HookRegistry.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFilter<T>(
  fn: (v: T, ...args: readonly unknown[]) => T,
  options: { pluginId?: string; priority?: number } = {},
): FilterEntry<T, T> {
  return {
    type: "filter",
    pluginId: options.pluginId ?? "test-plugin",
    priority: options.priority ?? DEFAULT_HOOK_PRIORITY,
    fn,
  };
}

function makeAction(
  fn: (...args: readonly unknown[]) => void | Promise<void>,
  options: { pluginId?: string; priority?: number } = {},
): ActionEntry {
  return {
    type: "action",
    pluginId: options.pluginId ?? "test-plugin",
    priority: options.priority ?? DEFAULT_HOOK_PRIORITY,
    fn,
  };
}

// Silence the resilience-logging path in tests that are not specifically
// asserting the log. Individual tests re-spy `console.warn` as needed.
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  warnSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// 1. addFilter + applyFilters — single filter mutates the value
// ---------------------------------------------------------------------------

describe("addFilter + applyFilters", () => {
  it("runs a single filter that mutates the value", () => {
    const r = createHookRegistry();
    r.addFilter<string>(
      "the_title",
      makeFilter<string>((v) => v.toUpperCase()),
    );
    expect(r.applyFilters<string>("the_title", "hello")).toBe("HELLO");
  });

  // ---------------------------------------------------------------------------
  // 2. Ordering by priority + stable tie-break
  // ---------------------------------------------------------------------------

  it("executes filters in priority order (5, 10, 20)", () => {
    const r = createHookRegistry();
    const calls: number[] = [];

    // Register out of order to prove insertion sorts, not registration order.
    r.addFilter<number>(
      "count",
      makeFilter<number>(
        (v) => {
          calls.push(20);
          return v + 100;
        },
        { priority: 20 },
      ),
    );
    r.addFilter<number>(
      "count",
      makeFilter<number>(
        (v) => {
          calls.push(5);
          return v + 1;
        },
        { priority: 5 },
      ),
    );
    r.addFilter<number>(
      "count",
      makeFilter<number>(
        (v) => {
          calls.push(10);
          return v + 10;
        },
        { priority: 10 },
      ),
    );

    const result = r.applyFilters<number>("count", 0);
    expect(calls).toEqual([5, 10, 20]);
    expect(result).toBe(111); // 0 + 1 + 10 + 100
  });

  it("preserves FIFO order for filters with equal priority", () => {
    const r = createHookRegistry();
    const calls: string[] = [];

    r.addFilter<string>(
      "chain",
      makeFilter<string>(
        (v) => {
          calls.push("first");
          return `${v}A`;
        },
        { priority: 10 },
      ),
    );
    r.addFilter<string>(
      "chain",
      makeFilter<string>(
        (v) => {
          calls.push("second");
          return `${v}B`;
        },
        { priority: 10 },
      ),
    );
    r.addFilter<string>(
      "chain",
      makeFilter<string>(
        (v) => {
          calls.push("third");
          return `${v}C`;
        },
        { priority: 10 },
      ),
    );

    expect(r.applyFilters<string>("chain", "")).toBe("ABC");
    expect(calls).toEqual(["first", "second", "third"]);
  });

  // ---------------------------------------------------------------------------
  // 3. applyFilters on unknown name — returns value intact
  // ---------------------------------------------------------------------------

  it("returns the initial value when no filters are registered", () => {
    const r = createHookRegistry();
    expect(r.applyFilters<string>("nothing_here", "untouched")).toBe(
      "untouched",
    );
  });

  // ---------------------------------------------------------------------------
  // 4. applyFilters resilience — a throwing filter is contained
  // ---------------------------------------------------------------------------

  it("catches a throwing filter, logs, and continues from the pre-error value", () => {
    const r = createHookRegistry();

    r.addFilter<string>(
      "boom",
      makeFilter<string>((v) => `${v}-ok1`, { priority: 10 }),
    );
    r.addFilter<string>(
      "boom",
      makeFilter<string>(
        () => {
          throw new Error("kaboom");
        },
        { priority: 20, pluginId: "bad-plugin" },
      ),
    );
    r.addFilter<string>(
      "boom",
      makeFilter<string>((v) => `${v}-ok3`, { priority: 30 }),
    );

    const result = r.applyFilters<string>("boom", "start");
    // Bad filter does not propagate — value carries through unchanged
    // between ok1 and ok3.
    expect(result).toBe("start-ok1-ok3");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/filter "boom"/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/bad-plugin/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/kaboom/);
  });
});

// ---------------------------------------------------------------------------
// 5. addAction + doAction — sync and async callbacks
// ---------------------------------------------------------------------------

describe("addAction + doAction", () => {
  it("runs sync and async actions sequentially by priority", async () => {
    const r = createHookRegistry();
    const calls: string[] = [];

    r.addAction(
      "init",
      makeAction(
        () => {
          calls.push("sync-first");
        },
        { priority: 5 },
      ),
    );
    r.addAction(
      "init",
      makeAction(
        async () => {
          await Promise.resolve();
          calls.push("async-second");
        },
        { priority: 10 },
      ),
    );

    await r.doAction("init");
    expect(calls).toEqual(["sync-first", "async-second"]);
  });

  // -------------------------------------------------------------------------
  // 6. doAction resilience — a rejecting action is contained
  // -------------------------------------------------------------------------

  it("catches a rejecting async action and continues the chain", async () => {
    const r = createHookRegistry();
    const calls: string[] = [];

    r.addAction(
      "boot",
      makeAction(
        async () => {
          calls.push("before");
        },
        { priority: 10 },
      ),
    );
    r.addAction(
      "boot",
      makeAction(
        async () => {
          throw new Error("reject-boom");
        },
        { priority: 20, pluginId: "bad-plugin" },
      ),
    );
    r.addAction(
      "boot",
      makeAction(
        async () => {
          calls.push("after");
        },
        { priority: 30 },
      ),
    );

    await expect(r.doAction("boot")).resolves.toBeUndefined();
    expect(calls).toEqual(["before", "after"]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/action "boot"/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/bad-plugin/);
  });

  it("resolves to undefined when no actions are registered", async () => {
    const r = createHookRegistry();
    await expect(r.doAction("nobody_listens")).resolves.toBeUndefined();
  });

  it("threads args into action callbacks", async () => {
    const r = createHookRegistry();
    const received: unknown[][] = [];
    r.addAction(
      "with_args",
      makeAction((...args) => {
        received.push([...args]);
      }),
    );
    await r.doAction("with_args", 1, "two", { three: true });
    expect(received).toEqual([[1, "two", { three: true }]]);
  });
});

// ---------------------------------------------------------------------------
// 7. removeAllByPlugin — surgical teardown by pluginId
// ---------------------------------------------------------------------------

describe("removeAllByPlugin", () => {
  it("removes every entry for the given pluginId across filters and actions", async () => {
    const r = createHookRegistry();
    const fired: string[] = [];

    // 3 entries by plugin A (2 filters + 1 action)
    r.addFilter<string>(
      "title",
      makeFilter<string>((v) => `${v}-A1`, { pluginId: "A" }),
    );
    r.addFilter<string>(
      "title",
      makeFilter<string>((v) => `${v}-A2`, { pluginId: "A", priority: 20 }),
    );
    r.addAction(
      "init",
      makeAction(
        () => {
          fired.push("A-action");
        },
        { pluginId: "A" },
      ),
    );

    // 2 entries by plugin B (1 filter + 1 action)
    r.addFilter<string>(
      "title",
      makeFilter<string>((v) => `${v}-B1`, { pluginId: "B", priority: 30 }),
    );
    r.addAction(
      "init",
      makeAction(
        () => {
          fired.push("B-action");
        },
        { pluginId: "B" },
      ),
    );

    r.removeAllByPlugin("A");

    // Only B's entries remain
    expect(r.hasFilter("title")).toBe(true);
    expect(r.hasAction("init")).toBe(true);

    const result = r.applyFilters<string>("title", "base");
    expect(result).toBe("base-B1");

    await r.doAction("init");
    expect(fired).toEqual(["B-action"]);
  });

  it("is idempotent — calling twice is a no-op after the first pass", () => {
    const r = createHookRegistry();
    r.addFilter<string>(
      "x",
      makeFilter<string>((v) => v, { pluginId: "A" }),
    );
    r.removeAllByPlugin("A");
    expect(() => r.removeAllByPlugin("A")).not.toThrow();
    expect(r.hasFilter("x")).toBe(false);
  });

  it("drops the map entry entirely when the last hook under a name is removed", () => {
    const r = createHookRegistry();
    r.addFilter<string>(
      "lonely",
      makeFilter<string>((v) => v, { pluginId: "A" }),
    );
    r.addAction(
      "lonely_action",
      makeAction(() => undefined, { pluginId: "A" }),
    );
    r.removeAllByPlugin("A");
    expect(r.hasFilter("lonely")).toBe(false);
    expect(r.hasAction("lonely_action")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. hasFilter / hasAction
// ---------------------------------------------------------------------------

describe("hasFilter / hasAction", () => {
  it("returns false for unknown names and true after registration", () => {
    const r = createHookRegistry();
    expect(r.hasFilter("x")).toBe(false);
    expect(r.hasAction("x")).toBe(false);

    r.addFilter<string>(
      "x",
      makeFilter<string>((v) => v),
    );
    expect(r.hasFilter("x")).toBe(true);
    expect(r.hasAction("x")).toBe(false); // same name, different map

    r.addAction(
      "x",
      makeAction(() => undefined),
    );
    expect(r.hasAction("x")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Manual idempotency — add → remove → add leaves a consistent state
// (fast-check is not installed in the workspace; we use 5 manual cycles
//  instead, per Sprint 1 day-1 brief.)
// ---------------------------------------------------------------------------

describe("idempotency across add → remove → add cycles", () => {
  it("registry state converges regardless of how many add/remove cycles occur", () => {
    const r = new HookRegistryImpl();
    const pluginId = "cycle-plugin";

    for (let i = 0; i < 5; i++) {
      r.addFilter<number>(
        "recycled",
        makeFilter<number>((v) => v + 1, { pluginId }),
      );
      r.addAction(
        "recycled_action",
        makeAction(() => undefined, { pluginId }),
      );
      expect(r.hasFilter("recycled")).toBe(true);
      expect(r.hasAction("recycled_action")).toBe(true);

      r.removeAllByPlugin(pluginId);
      expect(r.hasFilter("recycled")).toBe(false);
      expect(r.hasAction("recycled_action")).toBe(false);
    }

    // Final add — the registry must behave as if it were fresh.
    r.addFilter<number>(
      "recycled",
      makeFilter<number>((v) => v + 1, { pluginId }),
    );
    expect(r.applyFilters<number>("recycled", 41)).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// 10. ADR-005 asymmetry — compile-time regression
// ---------------------------------------------------------------------------

describe("ADR-005 asymmetry (applyFilters sync, doAction async)", () => {
  it("applyFilters returns T synchronously (not a Promise)", () => {
    const r = createHookRegistry();
    r.addFilter<number>(
      "n",
      makeFilter<number>((v) => v * 2),
    );
    // If `applyFilters` ever leaked a Promise return type, this assignment
    // would widen to `number | Promise<number>` and the `.toFixed` call would
    // fail type-check.
    const result: number = r.applyFilters<number>("n", 21);
    expect(result).toBe(42);
    expect(typeof result.toFixed).toBe("function");
    // Runtime asymmetry: result is definitely not a thenable.
    expect(result).not.toHaveProperty("then");
  });

  it("doAction always returns a Promise<void>", () => {
    const r = createHookRegistry();
    r.addAction(
      "noop",
      makeAction(() => undefined),
    );
    // Type-level: `.then` exists on the return value.
    const p = r.doAction("noop");
    expect(p).toBeInstanceOf(Promise);
    return expect(p).resolves.toBeUndefined();
  });
});
