/**
 * Wrapper functions for resilient hook execution — ADR-004 crash isolation.
 *
 * These wrappers sit between the HookRegistry and plugin callbacks, adding:
 * - Detection of developer errors (e.g., async filter returns Promise)
 * - Fail-fast circuit breaker integration
 * - Consistent error logging
 *
 * Design:
 * - `wrapSyncFilter`: Wraps FilterCallback. Enforces sync execution;
 *   logs and returns original value if Promise detected.
 * - `wrapAsyncAction`: Wraps ActionCallback. Tolerates async; logs
 *   and suppresses errors, never propagates.
 * Both feed failures into a shared CircuitBreaker for plugin isolation.
 */

import type { CircuitBreaker } from "./CircuitBreaker.js";

/**
 * Configuration for wrapper functions.
 */
interface WrapperOptions {
  /** Identifier of the plugin owning this callback. */
  pluginId: string;
  /** Shared circuit breaker for the registry. */
  breaker: CircuitBreaker;
}

/**
 * Wraps a filter callback with resilience: detects Promise returns (developer
 * error), catches thrown exceptions, and integrates with circuit breaker.
 *
 * Behavior:
 * - Normal case: executes `fn(value, ...args)` and returns result synchronously.
 * - Promise return: logs developer error, returns `value` unchanged (fail-safe).
 * - Thrown error: logs exception, records failure in breaker, returns `value`.
 * - Circuit open: skips execution, returns `value`, logs "circuit-open".
 *
 * @typeParam T - Input value type.
 * @typeParam R - Output value type. Defaults to T.
 */
export function wrapSyncFilter<T, R = T>(
  fn: (value: T, ...args: readonly unknown[]) => T | R,
  opts: WrapperOptions,
): (value: T, ...args: readonly unknown[]) => T | R {
  return (value: T, ...args: readonly unknown[]): T | R => {
    const { pluginId, breaker } = opts;

    // Fail-fast: if the circuit is open, skip execution.
    if (breaker.isOpen(pluginId)) {
      console.warn(
        `[HookRegistry] filter plugin "${pluginId}" circuit-open, skipping`,
      );
      return value;
    }

    try {
      const result = fn(value, ...args);

      // Detect Promise return (developer error in a sync filter).
      if (result !== null && typeof result === "object" && "then" in result) {
        console.warn(
          `[HookRegistry] filter plugin "${pluginId}" returned a Promise, ` +
            `but filters MUST be synchronous. Returning original value unchanged.`,
        );
        return value;
      }

      return result;
    } catch (err) {
      // Log and record failure.
      breaker.recordFailure(pluginId);
      console.warn(
        `[HookRegistry] filter plugin "${pluginId}" threw an error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      return value;
    }
  };
}

/**
 * Wraps an action callback with resilience: catches exceptions and rejections,
 * and integrates with circuit breaker. Always returns a Promise.
 *
 * Behavior:
 * - Normal case: executes `fn(...args)` and awaits if it returns a Promise.
 * - Thrown/rejected error: logs exception, records failure in breaker, resolves.
 * - Circuit open: skips execution, logs "circuit-open", resolves.
 *
 * Never propagates errors — the chain of actions always completes. Errors are
 * logged for observability but swallowed internally.
 */
export function wrapAsyncAction(
  fn: (...args: readonly unknown[]) => void | Promise<void>,
  opts: WrapperOptions,
): (...args: readonly unknown[]) => Promise<void> {
  return async (...args: readonly unknown[]): Promise<void> => {
    const { pluginId, breaker } = opts;

    // Fail-fast: if the circuit is open, skip execution.
    if (breaker.isOpen(pluginId)) {
      console.warn(
        `[HookRegistry] action plugin "${pluginId}" circuit-open, skipping`,
      );
      return;
    }

    try {
      const result = fn(...args);

      // Handle both sync and async returns.
      if (
        result !== undefined &&
        typeof result === "object" &&
        "then" in result
      ) {
        await result;
      }
    } catch (err) {
      // Log and record failure. Do NOT propagate.
      breaker.recordFailure(pluginId);
      console.warn(
        `[HookRegistry] action plugin "${pluginId}" threw an error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  };
}
