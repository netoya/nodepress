/**
 * Wrapper functions test suite — covers resilience, error handling,
 * Promise detection, and circuit breaker integration.
 *
 * Scope:
 *  - wrapSyncFilter: normal, Promise return (dev error), thrown errors
 *  - wrapAsyncAction: sync/async, thrown/rejected, never propagates
 *  - Circuit breaker integration: open state prevents execution
 *  - Logging: correct warn messages for each scenario
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCircuitBreaker,
  type CircuitBreaker,
} from "../CircuitBreaker.js";
import { wrapAsyncAction, wrapSyncFilter } from "../wrappers.js";

describe("wrapSyncFilter", () => {
  let breaker: CircuitBreaker;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    breaker = createCircuitBreaker();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  // ---------------------------------------------------------------------------
  // 1. Normal execution
  // ---------------------------------------------------------------------------

  it("executes a normal synchronous filter and returns the result", () => {
    const fn = (v: string) => v.toUpperCase();
    const wrapped = wrapSyncFilter(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    const result = wrapped("hello");
    expect(result).toBe("HELLO");
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("threads additional arguments to the filter", () => {
    const fn = (v: number, multiplier: number) => v * multiplier;
    const wrapped = wrapSyncFilter(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    const result = wrapped(5, 3);
    expect(result).toBe(15);
  });

  // ---------------------------------------------------------------------------
  // 2. Promise return detection (developer error)
  // ---------------------------------------------------------------------------

  it("detects Promise return and logs developer error, returning original value", () => {
    const fn = async (v: string) => {
      await Promise.resolve();
      return v.toUpperCase();
    };

    const wrapped = wrapSyncFilter(fn, {
      pluginId: "bad-plugin",
      breaker,
    });

    const result = wrapped("hello");
    expect(result).toBe("hello"); // Original value, not awaited
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/bad-plugin/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/Promise/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/synchronous/);
  });

  it("handles a function that returns Promise.resolve(value)", () => {
    const fn = (v: number) => Promise.resolve(v * 2);
    const wrapped = wrapSyncFilter(fn, {
      pluginId: "async-filter",
      breaker,
    });

    const result = wrapped(21);
    expect(result).toBe(21); // Unwrapped original
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Thrown exceptions
  // ---------------------------------------------------------------------------

  it("catches a thrown error, logs it, records failure, and returns original value", () => {
    const fn = (_v: string) => {
      throw new Error("filter boom");
    };

    const wrapped = wrapSyncFilter(fn, {
      pluginId: "failing-plugin",
      breaker,
    });

    const result = wrapped("input");
    expect(result).toBe("input");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/failing-plugin/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/filter boom/);

    // Circuit breaker recorded the failure.
    expect(breaker.isOpen("failing-plugin")).toBe(false); // 1 failure < 5
  });

  it("accumulates failures toward circuit breaker threshold", () => {
    const fn = () => {
      throw new Error("boom");
    };

    const wrapped = wrapSyncFilter(fn, {
      pluginId: "failing-plugin",
      breaker,
    });

    for (let i = 0; i < 4; i++) {
      wrapped("v");
    }

    // 4 failures total, breaker not yet open.
    expect(breaker.isOpen("failing-plugin")).toBe(false);

    // 5th failure opens the breaker.
    wrapped("v");
    expect(breaker.isOpen("failing-plugin")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Circuit breaker open state
  // ---------------------------------------------------------------------------

  it("skips execution when circuit is open", () => {
    const fn = vi.fn((v: string) => v.toUpperCase());

    const wrapped = wrapSyncFilter(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    // Manually open the breaker (simulate 5 failures).
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure("test-plugin");
    }
    expect(breaker.isOpen("test-plugin")).toBe(true);

    // Wrapped function should skip execution.
    const result = wrapped("hello");
    expect(result).toBe("hello");
    expect(fn).not.toHaveBeenCalled(); // Never invoked
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/circuit-open/);
  });
});

describe("wrapAsyncAction", () => {
  let breaker: CircuitBreaker;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    breaker = createCircuitBreaker();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  // ---------------------------------------------------------------------------
  // 1. Normal execution (sync and async)
  // ---------------------------------------------------------------------------

  it("executes a synchronous action and returns a resolved Promise", async () => {
    const events: string[] = [];
    const fn = () => {
      events.push("executed");
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    const result = wrapped();
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBeUndefined();
    expect(events).toEqual(["executed"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("executes an asynchronous action, awaits it, and returns resolved Promise", async () => {
    const events: string[] = [];
    const fn = async () => {
      await Promise.resolve();
      events.push("async-executed");
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    await wrapped();
    expect(events).toEqual(["async-executed"]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("threads arguments through to the action", async () => {
    const received: unknown[][] = [];
    const fn = (...args: unknown[]) => {
      received.push([...args]);
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "test-plugin",
      breaker,
    });

    await wrapped(1, "two", { three: true });
    expect(received).toEqual([[1, "two", { three: true }]]);
  });

  // ---------------------------------------------------------------------------
  // 2. Thrown exceptions (sync)
  // ---------------------------------------------------------------------------

  it("catches a thrown sync error, logs it, records failure, and resolves", async () => {
    const fn = () => {
      throw new Error("sync boom");
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "failing-action",
      breaker,
    });

    // Should not throw or reject; should resolve normally.
    const result = wrapped();
    await expect(result).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/failing-action/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/sync boom/);

    expect(breaker.isOpen("failing-action")).toBe(false); // 1 failure < 5
  });

  // ---------------------------------------------------------------------------
  // 3. Rejected promises (async)
  // ---------------------------------------------------------------------------

  it("catches a rejected async action, logs it, records failure, and resolves", async () => {
    const fn = async () => {
      await Promise.reject(new Error("async boom"));
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "failing-async-action",
      breaker,
    });

    // Should not reject; should resolve normally.
    const result = wrapped();
    await expect(result).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/failing-async-action/);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/async boom/);

    expect(breaker.isOpen("failing-async-action")).toBe(false);
  });

  it("accumulates failures toward circuit breaker threshold", async () => {
    const fn = async () => {
      throw new Error("boom");
    };

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "failing-action",
      breaker,
    });

    for (let i = 0; i < 5; i++) {
      await wrapped();
    }

    // 5 failures opens the breaker.
    expect(breaker.isOpen("failing-action")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 4. Circuit breaker open state
  // ---------------------------------------------------------------------------

  it("skips execution when circuit is open", async () => {
    const fn = vi.fn(async () => undefined);

    const wrapped = wrapAsyncAction(fn, {
      pluginId: "test-action",
      breaker,
    });

    // Manually open the breaker.
    for (let i = 0; i < 6; i++) {
      breaker.recordFailure("test-action");
    }
    expect(breaker.isOpen("test-action")).toBe(true);

    // Wrapped function should skip execution.
    const result = wrapped();
    await expect(result).resolves.toBeUndefined();
    expect(fn).not.toHaveBeenCalled(); // Never invoked
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0]?.[0]).toMatch(/circuit-open/);
  });

  // ---------------------------------------------------------------------------
  // 5. Always returns a Promise
  // ---------------------------------------------------------------------------

  it("always returns a Promise, even for sync actions", () => {
    const fn = () => undefined;
    const wrapped = wrapAsyncAction(fn, { pluginId: "sync-action", breaker });

    const result = wrapped();
    expect(result).toBeInstanceOf(Promise);
  });
});
