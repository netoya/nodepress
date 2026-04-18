/**
 * CircuitBreaker — Fail-fast isolation for misbehaving plugins.
 *
 * When a plugin (identified by pluginId) exceeds a failure threshold within a
 * time window, the circuit "opens" and the plugin is skipped on subsequent hook
 * invocations.
 *
 * Policies:
 * - Threshold: 5 failures in a 60-second window.
 * - State: Tracking timestamps of recent failures per pluginId.
 * - Reset: Automatic after 60 seconds of zero failures (sliding window cutoff).
 * - GC: Periodic cleanup of stale entries (configurable, default 60 seconds).
 *
 * Implementation: Map<pluginId, timestamps[]> with optional background GC.
 *
 * Thread safety (Node.js single-threaded): All methods are synchronous and
 * non-blocking. No `await` or callbacks occur within critical sections, so
 * mutations are atomic from the event loop's perspective. If async boundaries
 * are introduced, explicit locking will be required.
 */

/**
 * Public interface for circuit breaker state queries and manual reset.
 */
export interface CircuitBreaker {
  /**
   * Record a failure for the given plugin. Increments the failure count.
   * If the count exceeds the threshold (5 failures in 60 seconds), the circuit
   * opens for this plugin.
   */
  recordFailure(pluginId: string): void;

  /**
   * Check if the circuit is open for the given plugin.
   * Returns true if the plugin has exceeded the failure threshold within the
   * time window.
   */
  isOpen(pluginId: string): boolean;

  /**
   * Manually reset the failure count for the given plugin (utility for tests).
   * If the pluginId is not tracked, this is a no-op.
   */
  reset(pluginId: string): void;

  /**
   * Destroy the breaker and cancel any pending timers.
   * Call this on application shutdown to prevent memory leaks.
   * After calling destroy(), the breaker must not be used.
   */
  destroy(): void;
}

/**
 * Implementation of CircuitBreaker using a simple timestamp-tracking map.
 * Each pluginId maps to an array of recent failure timestamps.
 *
 * Includes optional periodic GC that scans and removes stale entries to prevent
 * unbounded memory growth (see ADR-013).
 */
class CircuitBreakerImpl implements CircuitBreaker {
  readonly #failures = new Map<string, number[]>();
  readonly #windowMs = 60_000; // 60 seconds
  readonly #threshold = 5;
  readonly #gcIntervalMs: number;
  #gcTimer: NodeJS.Timeout | null = null;

  constructor(gcIntervalMs: number = 60_000) {
    this.#gcIntervalMs = gcIntervalMs;
    this.#startGC();
  }

  #startGC(): void {
    // Schedule periodic garbage collection of stale entries.
    // This prevents unbounded Map growth from plugins that fail once and are
    // never queried again (so their stale timestamps are never lazy-pruned).
    if (this.#gcIntervalMs > 0) {
      this.#gcTimer = setInterval(() => {
        this.#collectGarbage();
      }, this.#gcIntervalMs);

      // Ensure the timer doesn't prevent process shutdown.
      if (this.#gcTimer.unref) {
        this.#gcTimer.unref();
      }
    }
  }

  #collectGarbage(): void {
    const now = Date.now();
    const cutoff = now - this.#windowMs;

    // Scan all entries; delete those with only stale timestamps.
    for (const [pluginId, timestamps] of this.#failures.entries()) {
      const recent = timestamps.filter((t) => t > cutoff);
      if (recent.length === 0) {
        this.#failures.delete(pluginId);
      } else if (recent.length < timestamps.length) {
        // Prune old entries (in case some were pruned but not all).
        this.#failures.set(pluginId, recent);
      }
    }
  }

  recordFailure(pluginId: string): void {
    const now = Date.now();
    const timestamps = this.#failures.get(pluginId) ?? [];

    // Prune timestamps older than the window.
    const cutoff = now - this.#windowMs;
    const recent = timestamps.filter((t) => t > cutoff);

    // Add the new failure and track.
    recent.push(now);
    this.#failures.set(pluginId, recent);
  }

  isOpen(pluginId: string): boolean {
    const now = Date.now();
    const timestamps = this.#failures.get(pluginId);

    if (!timestamps || timestamps.length === 0) return false;

    // Prune stale timestamps.
    const cutoff = now - this.#windowMs;
    const recent = timestamps.filter((t) => t > cutoff);

    // Update the stored list (garbage collection).
    if (recent.length === 0) {
      this.#failures.delete(pluginId);
      return false;
    }
    if (recent.length !== timestamps.length) {
      this.#failures.set(pluginId, recent);
    }

    // Open if threshold reached or exceeded (5+ failures).
    return recent.length >= this.#threshold;
  }

  reset(pluginId: string): void {
    this.#failures.delete(pluginId);
  }

  destroy(): void {
    if (this.#gcTimer) {
      clearInterval(this.#gcTimer);
      this.#gcTimer = null;
    }
    // Clear all entries to free memory.
    this.#failures.clear();
  }
}

/**
 * Factory for creating a fresh CircuitBreaker instance.
 * Each application context should have one shared breaker for the entire
 * hook registry (injected at HookRegistry construction time).
 *
 * @param gcIntervalMs - Interval (in milliseconds) for periodic garbage collection
 *                       of stale entries. Defaults to 60_000 (60 seconds).
 *                       Set to 0 to disable automatic GC (useful for tests).
 */
export function createCircuitBreaker(
  gcIntervalMs: number = 60_000,
): CircuitBreaker {
  return new CircuitBreakerImpl(gcIntervalMs);
}
