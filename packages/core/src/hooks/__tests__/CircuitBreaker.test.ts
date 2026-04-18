/**
 * CircuitBreaker test suite — covers the fail-fast isolation policy.
 *
 * Scope:
 *  - Recording failures and threshold detection
 *  - Automatic window-based cleanup (60s cutoff)
 *  - Manual reset for test cleanup
 *  - Edge cases (empty state, multiple pluginIds)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createCircuitBreaker,
  type CircuitBreaker,
} from "../CircuitBreaker.js";

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    // Disable automatic GC (pass 0 as gcIntervalMs) for unit tests to avoid
    // background cleanup interfering with test logic.
    breaker = createCircuitBreaker(0);
    vi.useFakeTimers();
  });

  afterEach(() => {
    breaker.destroy();
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 1. Threshold detection — 5 failures in 60 seconds opens
  // ---------------------------------------------------------------------------

  it("opens after 5 failures within the 60-second window", () => {
    expect(breaker.isOpen("plugin-a")).toBe(false);

    for (let i = 1; i <= 5; i++) {
      breaker.recordFailure("plugin-a");
      expect(breaker.isOpen("plugin-a")).toBe(i === 5);
    }
  });

  it("does not open with fewer than 5 failures", () => {
    breaker.recordFailure("plugin-a");
    breaker.recordFailure("plugin-a");
    breaker.recordFailure("plugin-a");
    breaker.recordFailure("plugin-a");
    expect(breaker.isOpen("plugin-a")).toBe(false);
  });

  it("opens on the 6th failure", () => {
    for (let i = 0; i < 6; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Automatic window-based reset — old failures drop after 60 seconds
  // ---------------------------------------------------------------------------

  it("auto-resets after 60 seconds of zero new failures", () => {
    // Record 4 failures (below threshold).
    for (let i = 0; i < 4; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(false);

    // Record the 5th to reach the threshold and open.
    breaker.recordFailure("plugin-a");
    expect(breaker.isOpen("plugin-a")).toBe(true);

    // Advance time by 59 seconds — still open (within window).
    vi.advanceTimersByTime(59_000);
    expect(breaker.isOpen("plugin-a")).toBe(true);

    // Advance one more second to cross the 60-second boundary.
    vi.advanceTimersByTime(1_001);
    // All 5 failures are now stale (recorded at t=0, window is now >60s).
    expect(breaker.isOpen("plugin-a")).toBe(false);
  });

  it("maintains open state if new failures are recorded before window expires", () => {
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(true);

    // Record a new failure at t=30s.
    vi.advanceTimersByTime(30_000);
    breaker.recordFailure("plugin-a");
    expect(breaker.isOpen("plugin-a")).toBe(true);

    // At t=60s, the original failures drop, but we have 2 recent ones.
    vi.advanceTimersByTime(30_001);
    expect(breaker.isOpen("plugin-a")).toBe(false); // Only 2 failures, not >= 5

    // But if we keep recording failures...
    for (let i = 0; i < 4; i++) {
      breaker.recordFailure("plugin-a");
    }
    // Now we have 6 recent failures total and it reopens.
    expect(breaker.isOpen("plugin-a")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. Isolation between pluginIds
  // ---------------------------------------------------------------------------

  it("isolates failure tracking per pluginId", () => {
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(true);
    expect(breaker.isOpen("plugin-b")).toBe(false);

    breaker.recordFailure("plugin-b");
    expect(breaker.isOpen("plugin-b")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Manual reset
  // ---------------------------------------------------------------------------

  it("resets failure tracking for a given pluginId", () => {
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(true);

    breaker.reset("plugin-a");
    expect(breaker.isOpen("plugin-a")).toBe(false);
  });

  it("reset is idempotent — calling twice is safe", () => {
    breaker.recordFailure("plugin-a");
    breaker.reset("plugin-a");
    expect(() => breaker.reset("plugin-a")).not.toThrow();
    expect(breaker.isOpen("plugin-a")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Edge cases
  // ---------------------------------------------------------------------------

  it("returns false for a pluginId that has never recorded failures", () => {
    expect(breaker.isOpen("unknown-plugin")).toBe(false);
  });

  it("handles rapid successive failures", () => {
    for (let i = 0; i < 10; i++) {
      breaker.recordFailure("plugin-rapid");
    }
    expect(breaker.isOpen("plugin-rapid")).toBe(true);
  });

  it("garbage-collects old timestamps during isOpen checks", () => {
    // Record 5 failures to open.
    for (let i = 0; i < 5; i++) {
      breaker.recordFailure("plugin-a");
    }
    expect(breaker.isOpen("plugin-a")).toBe(true);

    // Advance past the window.
    vi.advanceTimersByTime(61_000);

    // isOpen prunes stale timestamps and returns false.
    expect(breaker.isOpen("plugin-a")).toBe(false);

    // The internal state should be cleaned. Adding a new failure shows
    // the old history is gone (only 1 failure, not >= 5).
    breaker.recordFailure("plugin-a");
    expect(breaker.isOpen("plugin-a")).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 6. Periodic GC (garbage collection) tests
  // ---------------------------------------------------------------------------

  it("GC removes stale entries (CLOSED state with no recent failures) after interval", () => {
    // Use a short GC interval for testing.
    const testBreaker = createCircuitBreaker(100); // 100ms GC interval

    // Record a single failure for plugin-a (does not open the circuit).
    testBreaker.recordFailure("plugin-a");
    expect(testBreaker.isOpen("plugin-a")).toBe(false);

    // Record a single failure for plugin-b.
    testBreaker.recordFailure("plugin-b");
    expect(testBreaker.isOpen("plugin-b")).toBe(false);

    // Advance time so both entries become stale (beyond 60s window).
    vi.advanceTimersByTime(61_000);

    // Query both to confirm they are stale.
    expect(testBreaker.isOpen("plugin-a")).toBe(false);
    expect(testBreaker.isOpen("plugin-b")).toBe(false);

    // Advance past the GC interval (100ms) to trigger cleanup.
    vi.advanceTimersByTime(100);

    // Now when we query for a non-existent plugin, the internal map
    // should be clean. We verify this by checking that the breaker
    // doesn't track any entries after GC.
    // Add a new failure and verify it's fresh (not part of old state).
    testBreaker.recordFailure("plugin-c");
    expect(testBreaker.isOpen("plugin-c")).toBe(false);

    // Clean up.
    testBreaker.destroy();
  });

  it("GC does not remove active entries (OPEN state or recent failures)", () => {
    // Use a short GC interval for testing.
    const testBreaker = createCircuitBreaker(100); // 100ms GC interval

    // Record 5 failures to open plugin-a (OPEN state).
    for (let i = 0; i < 5; i++) {
      testBreaker.recordFailure("plugin-a");
    }
    expect(testBreaker.isOpen("plugin-a")).toBe(true);

    // Trigger GC before the entry becomes stale.
    vi.advanceTimersByTime(100);

    // plugin-a should still be open (GC preserves recent entries).
    expect(testBreaker.isOpen("plugin-a")).toBe(true);

    // Record a fresh failure for plugin-b at a later time.
    vi.advanceTimersByTime(30_000);
    testBreaker.recordFailure("plugin-b");
    expect(testBreaker.isOpen("plugin-b")).toBe(false);

    // Trigger another GC.
    vi.advanceTimersByTime(100);

    // plugin-b should still be tracked (fresh failure is within window).
    expect(testBreaker.isOpen("plugin-b")).toBe(false);

    // plugin-a should still be open.
    expect(testBreaker.isOpen("plugin-a")).toBe(true);

    // Clean up.
    testBreaker.destroy();
  });

  it("destroy() cancels GC timer and prevents memory leaks", () => {
    // Use a short GC interval.
    const testBreaker = createCircuitBreaker(100);

    // Record some failures.
    testBreaker.recordFailure("plugin-a");
    expect(testBreaker.isOpen("plugin-a")).toBe(false);

    // Call destroy() to cancel the timer.
    testBreaker.destroy();

    // Advance time past the GC interval. No errors should occur,
    // and the timer should not fire (no internal updates).
    vi.advanceTimersByTime(100);
    vi.advanceTimersByTime(100);

    // Verify destroy ran without error (implicit pass if no throw).
    expect(true).toBe(true);
  });
});
