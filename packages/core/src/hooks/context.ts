/**
 * Helper: wrap disposeAll with a timeout (D-014 enforcement).
 * Returns a rejected promise if the timeout fires; otherwise resolves normally.
 */
function createDisposalTimeoutPromise<T = void>(ms: number): Promise<T> {
  return new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Disposal timeout exceeded: ${ms}ms`)),
      ms,
    ),
  );
}

/**
 * Apply a timeout to a DisposableRegistry.disposeAll() call.
 * If the disposal takes longer than `ms`, the returned promise rejects;
 * the internal disposers continue to run but the caller does not wait.
 *
 * @param registry - The registry to wrap.
 * @param ms - Timeout in milliseconds.
 * @returns A promise that rejects on timeout, resolves on successful disposal.
 */
export async function withDisposalTimeout(
  registry: DisposableRegistry,
  ms: number,
): Promise<void> {
  const disposalPromise = registry.disposeAll();
  const timeoutPromise = createDisposalTimeoutPromise<void>(ms);
  return Promise.race([disposalPromise, timeoutPromise]);
}

/**
 * DisposableRegistry — ordered cleanup interface for plugin deactivation.
 *
 * Consumed by `PluginContext` to manage resources that must be released when a
 * plugin enters the DRAINING state (ADR-004 § Plugin Lifecycle). Any resource
 * the plugin allocates (timers, open handles, custom caches) should be
 * registered here so the framework can guarantee cleanup without relying on
 * plugin cooperation.
 *
 * Implementation contract (for #14 / #19):
 *
 * - `register` is synchronous and idempotent relative to the same `dispose`
 *   reference. Implementations may choose to deduplicate by reference.
 * - `disposeAll` must await each registered disposer sequentially. It MUST NOT
 *   reject — individual disposer failures must be caught and logged internally.
 *   The caller (plugin lifecycle) treats `disposeAll` as a best-effort cleanup
 *   with a hard timeout (5 s per ADR-004; 10 s DRAINING window total).
 *   Use `withDisposalTimeout(registry, 5000)` to enforce this guard.
 * - After `disposeAll` resolves, the registry is considered empty. Subsequent
 *   calls to `disposeAll` resolve immediately (idempotent).
 */
export interface DisposableRegistry {
  /**
   * Register a disposer function to be called during plugin deactivation.
   *
   * @param dispose - Zero-argument function that releases a resource. May be
   *   synchronous (`void`) or asynchronous (`Promise<void>`). The registry
   *   awaits it during `disposeAll`.
   */
  register(dispose: () => void | Promise<void>): void;

  /**
   * Invoke all registered disposers sequentially and await each one.
   *
   * Resolves once every disposer has settled (fulfilled or failed). Individual
   * failures are contained — they do not abort the remaining disposers.
   * After this method resolves, the registry is emptied.
   *
   * @returns A `Promise` that resolves when cleanup is complete.
   */
  disposeAll(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Concrete implementation
// ---------------------------------------------------------------------------

/**
 * Reference implementation of {@link DisposableRegistry}.
 *
 * Used by `PluginContext` implementations to manage resource cleanup during
 * the DRAINING phase of plugin deactivation (ADR-004).
 *
 * Key properties:
 * - `register` is O(1) and synchronous.
 * - `disposeAll` runs disposers sequentially (insertion order). A failing
 *   disposer is logged via `console.warn` and does not abort the chain.
 * - After `disposeAll` resolves the internal list is cleared — a second call
 *   resolves immediately without re-running any disposer.
 *
 * Timeout guard (D-014 resolution):
 * Per ADR-004, the lifecycle must enforce a 5s total timeout for the DRAINING
 * window. Callers that enforce per-disposer timeouts should wrap disposeAll
 * via `withDisposalTimeout(registry, 5_000)` (see below).
 */
export class DisposableRegistryImpl implements DisposableRegistry {
  readonly #disposers: Array<() => void | Promise<void>> = [];

  register(dispose: () => void | Promise<void>): void {
    this.#disposers.push(dispose);
  }

  async disposeAll(): Promise<void> {
    // Drain the list by splicing out all entries atomically before running
    // them. This guarantees idempotency: a second `disposeAll` call that
    // races the first (or follows it) sees an empty list and returns
    // immediately without re-firing any disposer.
    const snapshot = this.#disposers.splice(0);
    for (const dispose of snapshot) {
      try {
        await dispose();
      } catch (err) {
        // Resilience: one failing disposer must not block the rest.
        // TODO: replace with injected logger once logger abstraction lands (#20).
        const msg =
          err instanceof Error
            ? err.message
            : typeof err === "string"
              ? err
              : String(err);
        console.warn(`[DisposableRegistry] disposer threw: ${msg}`);
      }
    }
  }
}
