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
 *
 * Implementation: Naive Map<pluginId, timestamps[]>. PoC-grade, not optimized.
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
}

/**
 * Implementation of CircuitBreaker using a simple timestamp-tracking map.
 * Each pluginId maps to an array of recent failure timestamps.
 */
class CircuitBreakerImpl implements CircuitBreaker {
  readonly #failures = new Map<string, number[]>();
  readonly #windowMs = 60_000; // 60 seconds
  readonly #threshold = 5;

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
}

/**
 * Factory for creating a fresh CircuitBreaker instance.
 * Each application context should have one shared breaker for the entire
 * hook registry (injected at HookRegistry construction time).
 */
export function createCircuitBreaker(): CircuitBreaker {
  return new CircuitBreakerImpl();
}
