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
 * TODO(D-014): Per ADR-004 the lifecycle imposes a 5 s per-plugin timeout on
 * the DRAINING window. Individual disposer timeouts are NOT yet implemented
 * here — that guard belongs to the lifecycle layer (`wrapAsyncAction` in #20).
 * Once #20 ships, callers should wrap this via `withTimeout(registry, 5_000)`.
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
