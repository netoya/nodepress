/**
 * DisposableRegistry test suite — covers the contract defined in `../context.ts`.
 *
 * Tests target `DisposableRegistryImpl` (the concrete class). The interface
 * itself (`DisposableRegistry`) is a structural contract; correctness is
 * demonstrated through the implementation.
 *
 * Scope:
 *  - register + disposeAll happy path (sync + async disposers)
 *  - sequential execution order
 *  - resilience: a throwing disposer does not abort remaining ones
 *  - idempotency: disposeAll clears the registry; second call is a no-op
 *  - mixed sync/async disposers in a single registry
 *  - timeout per disposer (D-014) — pending implementation in lifecycle layer
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DisposableRegistryImpl } from "../context.js";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("DisposableRegistryImpl", () => {
  let registry: DisposableRegistryImpl;

  beforeEach(() => {
    registry = new DisposableRegistryImpl();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. register
  // -------------------------------------------------------------------------

  describe("register", () => {
    it("accepts a synchronous disposer without throwing", () => {
      expect(() => registry.register(() => undefined)).not.toThrow();
    });

    it("accepts an asynchronous disposer without throwing", () => {
      expect(() => registry.register(() => Promise.resolve())).not.toThrow();
    });

    it("multiple registrations are queued independently", async () => {
      const calls: number[] = [];
      registry.register(() => {
        calls.push(1);
      });
      registry.register(() => {
        calls.push(2);
      });
      registry.register(() => {
        calls.push(3);
      });
      await registry.disposeAll();
      expect(calls).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // 2. disposeAll — sequential execution
  // -------------------------------------------------------------------------

  describe("disposeAll — sequential execution", () => {
    it("invokes all registered sync disposers", async () => {
      const calls: number[] = [];
      registry.register(() => {
        calls.push(1);
      });
      registry.register(() => {
        calls.push(2);
      });
      await registry.disposeAll();
      expect(calls).toEqual([1, 2]);
    });

    it("runs disposers in registration order (FIFO)", async () => {
      const order: string[] = [];
      registry.register(() => {
        order.push("first");
      });
      registry.register(() => {
        order.push("second");
      });
      registry.register(() => {
        order.push("third");
      });
      await registry.disposeAll();
      expect(order).toEqual(["first", "second", "third"]);
    });

    it("awaits async disposers before running the next one", async () => {
      const order: string[] = [];
      registry.register(async () => {
        await new Promise<void>((r) => setTimeout(r, 10));
        order.push("slow");
      });
      registry.register(() => {
        order.push("fast");
      });
      await registry.disposeAll();
      // "slow" must finish before "fast" starts
      expect(order).toEqual(["slow", "fast"]);
    });
  });

  // -------------------------------------------------------------------------
  // 3. resilience — a throwing disposer does not abort remaining ones
  // -------------------------------------------------------------------------

  describe("disposeAll — error containment", () => {
    it("continues running remaining disposers after a sync throw", async () => {
      const afterThrow = vi.fn();
      registry.register(() => {
        throw new Error("boom");
      });
      registry.register(afterThrow);
      await registry.disposeAll();
      expect(afterThrow).toHaveBeenCalledOnce();
    });

    it("continues running remaining disposers after an async rejection", async () => {
      const afterReject = vi.fn();
      registry.register(() => Promise.reject(new Error("async boom")));
      registry.register(afterReject);
      await registry.disposeAll();
      expect(afterReject).toHaveBeenCalledOnce();
    });

    it("logs a warning when a disposer throws", async () => {
      registry.register(() => {
        throw new Error("bad disposer");
      });
      await registry.disposeAll();
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining("bad disposer"),
      );
    });

    it("handles non-Error string throws gracefully", async () => {
      registry.register(() => {
         
        throw "string error";
      });
      // Must not reject
      await expect(registry.disposeAll()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });

    it("handles non-Error non-string throws (objects) gracefully", async () => {
      registry.register(() => {
         
        throw { code: 42 };
      });
      await expect(registry.disposeAll()).resolves.toBeUndefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 4. mixed sync + async disposers
  // -------------------------------------------------------------------------

  describe("disposeAll — mixed sync and async", () => {
    it("handles a mix of sync and async disposers correctly", async () => {
      const log: string[] = [];
      registry.register(() => {
        log.push("sync-1");
      });
      registry.register(async () => {
        await Promise.resolve();
        log.push("async-1");
      });
      registry.register(() => {
        log.push("sync-2");
      });
      registry.register(async () => {
        await new Promise<void>((r) => setTimeout(r, 5));
        log.push("async-2");
      });
      await registry.disposeAll();
      expect(log).toEqual(["sync-1", "async-1", "sync-2", "async-2"]);
    });
  });

  // -------------------------------------------------------------------------
  // 5. idempotency — second disposeAll is a no-op
  // -------------------------------------------------------------------------

  describe("disposeAll — idempotency", () => {
    it("clears the registry after the first call", async () => {
      const disposer = vi.fn();
      registry.register(disposer);
      await registry.disposeAll();
      await registry.disposeAll(); // second call
      expect(disposer).toHaveBeenCalledOnce();
    });

    it("resolves immediately on subsequent calls without registered disposers", async () => {
      await registry.disposeAll(); // empty registry — no error
      await expect(registry.disposeAll()).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 6. Timeout per disposer — D-014
  // TODO(D-014): Individual per-disposer timeout (5 s) is not yet implemented
  // in DisposableRegistryImpl. The guard belongs to the lifecycle layer
  // (`wrapAsyncAction` in #20). Tracked as D-014 in ADR-004.
  // -------------------------------------------------------------------------

  describe("disposeAll — timeout handling (D-014)", () => {
    it.todo(
      "a disposer that hangs longer than 5 s should be abandoned with a warning (D-014 / #20)",
    );
  });
});
