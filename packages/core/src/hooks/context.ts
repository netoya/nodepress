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
