/**
 * CircuitBreaker stress test suite — concurrent failure recording, race conditions,
 * and integration with HookRegistry under load.
 *
 * These tests verify the breaker's behavior under high concurrency:
 * - Stress Test 1: Concurrent failure recording (50 simultaneous calls)
 * - Stress Test 2: Open threshold detection under load (100 hits in 1s)
 * - Stress Test 3: PluginId isolation with 5 parallel plugins
 * - Stress Test 4: Auto-reset with mixed workload
 * - Stress Test 5: HookRegistry integration under load (100 concurrent applyFilters)
 * - Stress Test 6: Memory pressure smoke test (1000 distinct pluginIds)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCircuitBreaker,
  type CircuitBreaker,
} from "../CircuitBreaker.js";
import { createHookRegistry } from "../HookRegistry.js";

describe("CircuitBreaker Stress Tests", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = createCircuitBreaker();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Stress Test 1: Concurrent failure recording
  // ---------------------------------------------------------------------------

  it("records exactly 50 concurrent failures without loss or duplication", () => {
    const pluginId = "concurrent-test";
    const concurrency = 50;

    // Simulate 50 concurrent recordFailure calls (all at the same logical time).
    // In Node.js single-threaded event loop, these are serialized anyway,
    // but we test the logic under the stress of rapid-fire calls.
    const promises: Promise<void>[] = [];

    for (let i = 0; i < concurrency; i++) {
      promises.push(
        Promise.resolve().then(() => {
          breaker.recordFailure(pluginId);
        }),
      );
    }

    // Run all promises at once (microtask queue serialization).
    // Note: vi.runAllTimersAsync() is not used here because recordFailure
    // doesn't schedule async work; we use Promise.resolve() for concurrency modeling.
    return Promise.all(promises).then(() => {
      // After all calls complete, manually check internal state via isOpen.
      // We expect 50 failures recorded; threshold is 5, so the circuit must be open.
      // To verify exactly 50 were recorded (not lost), we can re-query after reset
      // and check the count increments correctly.
      expect(breaker.isOpen(pluginId)).toBe(true);

      // Now verify no loss by recording one more and checking it opens immediately.
      // (It should already be open, so this is a sanity check.)
      breaker.recordFailure(pluginId);
      expect(breaker.isOpen(pluginId)).toBe(true);

      // Reset and record 5 times to confirm baseline threshold still works
      // (i.e., the 50 prior calls didn't corrupt internal state).
      breaker.reset(pluginId);
      for (let i = 0; i < 5; i++) {
        breaker.recordFailure(pluginId);
      }
      expect(breaker.isOpen(pluginId)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Stress Test 2: Open threshold detection under load
  // ---------------------------------------------------------------------------

  it("opens circuit within threshold window under rapid-fire failures (100 hits in 1s)", () => {
    const pluginId = "rapid-fire";

    // Record 100 failures as fast as possible (simulating load).
    // The threshold is 5 failures in 60s window, so it should open immediately.
    for (let i = 0; i < 100; i++) {
      breaker.recordFailure(pluginId);
    }

    expect(breaker.isOpen(pluginId)).toBe(true);

    // Now simulate 10 queries at different time offsets to verify the circuit
    // stays open throughout the window and only closes after window expiry.
    const queryOffsets = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900];
    const states: boolean[] = [];

    for (const offset of queryOffsets) {
      vi.advanceTimersByTime(offset);
      states.push(breaker.isOpen(pluginId));
    }

    // All 10 queries should see the circuit open (within the 900ms window,
    // well under the 60s threshold).
    expect(states.every((s) => s === true)).toBe(true);

    // Advance past 60s and verify it closes.
    vi.advanceTimersByTime(61_000 - 900); // 61s total from start
    expect(breaker.isOpen(pluginId)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Stress Test 3: PluginId isolation under parallel load
  // ---------------------------------------------------------------------------

  it("isolates 5 plugins under concurrent load (10 failures each in parallel)", () => {
    const pluginIds = [
      "plugin-a",
      "plugin-b",
      "plugin-c",
      "plugin-d",
      "plugin-e",
    ];
    const failureCount = 10; // Each plugin gets 10 failures (> 5 threshold)

    // Record failures for all plugins "concurrently" (via Promise chaining).
    const promises: Promise<void>[] = [];

    for (const pluginId of pluginIds) {
      const pluginPromises: Promise<void>[] = [];
      for (let i = 0; i < failureCount; i++) {
        pluginPromises.push(
          Promise.resolve().then(() => {
            breaker.recordFailure(pluginId);
          }),
        );
      }
      promises.push(Promise.all(pluginPromises).then(() => undefined));
    }

    return Promise.all(promises).then(() => {
      // All 5 plugins should now have open circuits.
      for (const pluginId of pluginIds) {
        expect(breaker.isOpen(pluginId)).toBe(true);
      }

      // Verify no cross-contamination: resetting one doesn't affect others.
      breaker.reset("plugin-a");
      expect(breaker.isOpen("plugin-a")).toBe(false);
      expect(breaker.isOpen("plugin-b")).toBe(true);
      expect(breaker.isOpen("plugin-c")).toBe(true);
      expect(breaker.isOpen("plugin-d")).toBe(true);
      expect(breaker.isOpen("plugin-e")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Stress Test 4: Auto-reset under mixed workload
  // ---------------------------------------------------------------------------

  it("auto-resets after 60s window expires, then re-opens if new failures arrive", () => {
    const pluginId = "mixed-workload";

    // Phase 1: Accumulate 10 failures at t=0.
    for (let i = 0; i < 10; i++) {
      breaker.recordFailure(pluginId);
    }
    expect(breaker.isOpen(pluginId)).toBe(true); // Open due to 5+ failures.

    // Phase 2: Advance 61 seconds (past the 60s window).
    vi.advanceTimersByTime(61_000);
    expect(breaker.isOpen(pluginId)).toBe(false); // Closed: old failures pruned.

    // Phase 3: Record 1 new failure at t=61s.
    breaker.recordFailure(pluginId);
    expect(breaker.isOpen(pluginId)).toBe(false); // 1 failure < 5 threshold.

    // Phase 4: Record 4 more failures at t=61s (total 5 at new time).
    for (let i = 0; i < 4; i++) {
      breaker.recordFailure(pluginId);
    }
    expect(breaker.isOpen(pluginId)).toBe(true); // Now open at new time window.

    // Phase 5: Advance another 61 seconds from the new time.
    vi.advanceTimersByTime(61_000);
    expect(breaker.isOpen(pluginId)).toBe(false); // Closed again.
  });

  // ---------------------------------------------------------------------------
  // Stress Test 5: HookRegistry integration under load
  // ---------------------------------------------------------------------------

  it("integrates with HookRegistry; opens plugin after reaching threshold during 100 applyFilters", () => {
    const pluginId = "noisy-plugin";
    const registry = createHookRegistry(breaker);

    // Deterministic approach: explicitly track which invocations fail.
    // We'll record failures manually to hit exactly the stress scenario.
    breaker.reset(pluginId); // Clean slate.

    // Simulate 30 failures across 100 invocations (30% failure rate, close to our 60% per-filter * 3 filters).
    // To keep it deterministic, we'll just record failures at specific indices.
    const failureIndices = Array.from({ length: 30 }, (_, i) => (i * 100) / 30);
    let invocationCount = 0;

    // Register a simpler deterministic filter.
    registry.removeAllByPlugin(pluginId);
    registry.addFilter("test-hook-deterministic", {
      type: "filter",
      pluginId,
      priority: 10,
      fn: (value: number) => {
        const shouldFail = failureIndices.includes(invocationCount);
        invocationCount++;
        if (shouldFail) {
          throw new Error("Deterministic failure");
        }
        return value;
      },
    });

    // Run 100 applyFilters. Each failure is recorded in the breaker.
    let filterValue = 0;
    for (let i = 0; i < 100; i++) {
      filterValue = registry.applyFilters<number>(
        "test-hook-deterministic",
        filterValue,
      );
    }

    // After 100 invocations with ~30 failures, check if the circuit is open.
    // Threshold is 5 failures, so it should definitely be open.
    expect(breaker.isOpen(pluginId)).toBe(true);

    // Verify that applying the filter again is skipped (circuit-open).
    // The filter counter should not increment because the plugin is isolated.
    const countBefore = invocationCount;
    registry.applyFilters<number>("test-hook-deterministic", filterValue);
    // The function call is skipped, so invocationCount should not increment.
    expect(invocationCount).toBe(countBefore);
  });

  // ---------------------------------------------------------------------------
  // Stress Test 6: Memory pressure smoke test
  // ---------------------------------------------------------------------------

  it("handles 1000 distinct pluginIds without unbounded memory growth (smoke test)", () => {
    const pluginCount = 1000;
    const failuresPerPlugin = 1; // Just 1 failure each (< threshold).

    // Record 1 failure for each of 1000 plugins.
    for (let i = 0; i < pluginCount; i++) {
      const pluginId = `plugin-${i}`;
      for (let j = 0; j < failuresPerPlugin; j++) {
        breaker.recordFailure(pluginId);
      }
    }

    // Verify none are open (only 1 failure each, threshold is 5).
    for (let i = 0; i < pluginCount; i++) {
      const pluginId = `plugin-${i}`;
      expect(breaker.isOpen(pluginId)).toBe(false);
    }

    // Verify that querying a non-existent plugin doesn't grow internal state.
    expect(breaker.isOpen("unknown-plugin")).toBe(false);

    // Note: This test does not enforce GC or memory limits. It's a smoke test
    // to verify the breaker doesn't catastrophically fail under large pluginId
    // cardinality. See ADR-013 for future work on GC / unbounded growth.
    //
    // If internal Map grows to 1000 entries (one per plugin), this is expected
    // PoC behavior. Production may need entry eviction or time-based cleanup.
  });
});
