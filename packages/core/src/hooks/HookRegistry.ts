/**
 * HookRegistry — reference implementation of the frozen contract in
 * `./types.ts`.
 *
 * Design notes:
 *
 * - Two `Map<string, Entry[]>` — one per hook kind. Keeping filters and actions
 *   in separate maps means `hasFilter` / `hasAction` are O(1) lookups and
 *   `applyFilters` / `doAction` never need to discriminate a shared list at
 *   runtime. The minor duplication is worth the clarity.
 * - Entry lists are kept sorted by `priority` ascending with **stable insertion
 *   order** for ties (WP semantics — see ADR-005 § Implementation Notes). We
 *   insert at the correct index on `addFilter` / `addAction` rather than
 *   re-sorting on every invocation, so the hot path (`applyFilters`,
 *   `doAction`) is a tight O(n) loop over already-ordered data.
 * - Errors are contained: a throwing filter or rejecting action is logged via
 *   `console.warn` and the pipeline continues. This is the minimal crash
 *   isolation required for #14. The full `wrapSyncFilter` / `wrapAsyncAction`
 *   circuit breaker ships with #20 (Raúl); see ADR-004 and the TODOs below.
 *
 * The class is exported for advanced use cases (subclassing in tests or
 * instrumentation hooks); prefer {@link createHookRegistry} for normal usage —
 * it returns a fresh instance typed as the public `HookRegistry` interface.
 */

import {
  type ActionEntry,
  type FilterEntry,
  type HookRegistry,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the insertion index that keeps `list` sorted by `priority` ascending
 * while preserving stable (FIFO) ordering for equal priorities.
 *
 * We want the new entry to land **after** every entry whose priority is less
 * than or equal to the incoming one — that is the WP tie-break: first
 * registered runs first at a given priority.
 */
function findStableInsertIndex<E extends { readonly priority: number }>(
  list: readonly E[],
  priority: number,
): number {
  // Linear scan is fine here: registration is not a hot path and typical
  // hook chains have < 20 entries. Binary search would add complexity for
  // no measurable win.
  for (let i = 0; i < list.length; i++) {
    const entry = list[i];
    if (entry !== undefined && entry.priority > priority) {
      return i;
    }
  }
  return list.length;
}

/**
 * Narrow an unknown thrown value to a message string for logging.
 */
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class HookRegistryImpl implements HookRegistry {
  readonly #filters = new Map<string, FilterEntry[]>();
  readonly #actions = new Map<string, ActionEntry[]>();

  addFilter<T = unknown, R = T>(name: string, entry: FilterEntry<T, R>): void {
    // `FilterEntry<T, R>` narrows to `FilterEntry<unknown, unknown>` at the
    // storage layer. The registry is type-erased internally — callers recover
    // the specific type at `applyFilters` via the `T` type parameter. This is
    // consistent with the v1 contract constraint `R = T` documented in
    // `types.ts` (ADR-005).
    const list = this.#filters.get(name) ?? [];
    const idx = findStableInsertIndex(list, entry.priority);
    list.splice(idx, 0, entry as FilterEntry);
    this.#filters.set(name, list);
  }

  addAction(name: string, entry: ActionEntry): void {
    const list = this.#actions.get(name) ?? [];
    const idx = findStableInsertIndex(list, entry.priority);
    list.splice(idx, 0, entry);
    this.#actions.set(name, list);
  }

  applyFilters<T = unknown>(
    name: string,
    value: T,
    ...args: readonly unknown[]
  ): T {
    const list = this.#filters.get(name);
    if (list === undefined || list.length === 0) return value;

    let current: T = value;
    for (const entry of list) {
      const previous: T = current;
      try {
        // TODO(#20 — Raúl): replace with `wrapSyncFilter` from ADR-004.
        // That wrapper will (a) detect a `Promise` return value and log the
        // developer error without awaiting, (b) feed the circuit breaker on
        // repeated failure. Here we only have try/catch resilience.
        const result = entry.fn(current, ...args) as T;
        current = result;
      } catch (err) {
        // Resilience: a broken filter must not break the pipeline. Pass the
        // pre-error value through to the next filter.
        // TODO: replace `console.warn` with injected logger once the logger
        // abstraction lands (tracked alongside #20).
        console.warn(
          `[HookRegistry] filter "${name}" threw from plugin "${entry.pluginId}" ` +
            `(priority ${entry.priority}): ${errorMessage(err)}`,
        );
        current = previous;
      }
    }
    return current;
  }

  async doAction(name: string, ...args: readonly unknown[]): Promise<void> {
    const list = this.#actions.get(name);
    if (list === undefined || list.length === 0) return;

    // Sequential await — priority ordering implies sequential execution.
    // `Promise.all` would race the callbacks and break the WP mental model
    // (ADR-005 § Implementation Notes).
    for (const entry of list) {
      try {
        // TODO(#20 — Raúl): replace with `wrapAsyncAction` from ADR-004 once
        // the circuit breaker is in place. Current behaviour is the minimal
        // isolation required for #14.
        await entry.fn(...args);
      } catch (err) {
        // TODO: replace `console.warn` with injected logger (see above).
        console.warn(
          `[HookRegistry] action "${name}" threw from plugin "${entry.pluginId}" ` +
            `(priority ${entry.priority}): ${errorMessage(err)}`,
        );
        // Swallow and continue — the next action in the chain still runs.
      }
    }
  }

  removeAllByPlugin(pluginId: string): void {
    // O(n) over the union of both maps. Deactivation is not a hot path
    // (ADR-005). Idempotent: calling twice with the same id is a no-op after
    // the first pass.
    for (const [name, list] of this.#filters) {
      const next = list.filter((e) => e.pluginId !== pluginId);
      if (next.length === 0) this.#filters.delete(name);
      else if (next.length !== list.length) this.#filters.set(name, next);
    }
    for (const [name, list] of this.#actions) {
      const next = list.filter((e) => e.pluginId !== pluginId);
      if (next.length === 0) this.#actions.delete(name);
      else if (next.length !== list.length) this.#actions.set(name, next);
    }
  }

  hasFilter(name: string): boolean {
    const list = this.#filters.get(name);
    return list !== undefined && list.length > 0;
  }

  hasAction(name: string): boolean {
    const list = this.#actions.get(name);
    return list !== undefined && list.length > 0;
  }
}

/**
 * Factory returning a fresh {@link HookRegistry}. Prefer this over constructing
 * {@link HookRegistryImpl} directly — it narrows the return type to the public
 * contract and isolates callers from implementation internals.
 *
 * Creating a dedicated instance per test keeps the suite free of shared global
 * state and makes parallel test execution safe.
 */
export function createHookRegistry(): HookRegistry {
  return new HookRegistryImpl();
}
