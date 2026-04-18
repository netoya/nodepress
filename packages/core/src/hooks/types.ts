/**
 * Hook system type contracts — NodePress core.
 *
 * Frozen public contract consumed by the plugin API (PluginContext) and the
 * HookRegistry implementation. Any breaking change to this file requires an
 * ADR and coordination across #14 (registry), #19 (plugin API), and #20
 * (plugin runtime).
 *
 * ## Sync/Async asymmetry (ADR-005)
 *
 * NodePress reproduces the WordPress plugin API semantics:
 *
 * - **Filters are synchronous.** `applyFilters(name, value, ...args)` returns
 *   the transformed value immediately. Filter callbacks MUST NOT return a
 *   Promise; if they do, the registry treats it as a developer error and
 *   passes the original value through unchanged (see ADR-004 § Crash
 *   Isolation). This preserves WP's mental model and ordering guarantees.
 * - **Actions are async-tolerant.** `doAction(name, ...args)` always returns
 *   a Promise. Callbacks may be sync (`void`) or async (`Promise<void>`);
 *   the registry awaits them sequentially by priority. Actions do not
 *   return values, so async is safe.
 *
 * This file defines types only. Implementation lives in `./registry.ts`.
 */

import type { DisposableRegistry } from "./context.js";

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Discriminator for the two hook kinds. Kept as a string literal union so it
 * can be serialized (admin panel, telemetry) without a runtime enum.
 */
export type HookType = "filter" | "action";

/**
 * Execution priority for a hook callback.
 *
 * Lower value runs first — identical to WordPress semantics. The WP default
 * is `10`; NodePress mirrors that default when a caller omits the argument.
 * Values are not constrained to integers, but keeping them integer-valued is
 * strongly recommended for portability with ported WP plugins.
 */
export type HookPriority = number;

/** Default priority applied when a caller omits the argument (WP-compatible). */
export const DEFAULT_HOOK_PRIORITY: HookPriority = 10;

// ---------------------------------------------------------------------------
// Callback signatures
// ---------------------------------------------------------------------------

/**
 * Filter callback. MUST be synchronous. Receives the current value and any
 * additional positional arguments supplied at `applyFilters` time, and MUST
 * return the (possibly transformed) value.
 *
 * @typeParam T - Input value type.
 * @typeParam R - Output value type. Defaults to `T` (same-in/same-out), which
 *                is the common case. Different `R` is allowed but unusual and
 *                requires consumers to coordinate priority chains carefully.
 */
export type FilterCallback<T = unknown, R = T> = (
  value: T,
  ...args: readonly unknown[]
) => R;

/**
 * Action callback. MAY be synchronous or asynchronous. Receives any positional
 * arguments supplied at `doAction` time. Return value is discarded; only
 * side-effects and thrown errors are observable.
 */
export type ActionCallback = (
  ...args: readonly unknown[]
) => void | Promise<void>;

// ---------------------------------------------------------------------------
// Registry entries
// ---------------------------------------------------------------------------

/**
 * Shared fields every hook entry carries, regardless of type. `pluginId` is
 * injected transparently by `PluginContext` — plugin authors never set it
 * directly. The registry uses it for bulk cleanup on plugin deactivation
 * (see `removeAllByPlugin`).
 */
interface HookEntryBase {
  /** Stable id of the plugin that registered this entry. */
  readonly pluginId: string;
  /** Numeric priority; lower runs first. See {@link HookPriority}. */
  readonly priority: HookPriority;
}

/**
 * A registered filter entry.
 */
export interface FilterEntry<T = unknown, R = T> extends HookEntryBase {
  readonly type: "filter";
  readonly fn: FilterCallback<T, R>;
}

/**
 * A registered action entry.
 */
export interface ActionEntry extends HookEntryBase {
  readonly type: "action";
  readonly fn: ActionCallback;
}

/**
 * Discriminated union of both entry kinds. Consumers should narrow via the
 * `type` discriminator rather than relying on structural checks.
 *
 * @typeParam T - Filter input type (ignored for action entries).
 * @typeParam R - Filter output type (ignored for action entries).
 */
export type HookEntry<T = unknown, R = T> = FilterEntry<T, R> | ActionEntry;

// ---------------------------------------------------------------------------
// Registry — internal API
// ---------------------------------------------------------------------------

/**
 * The HookRegistry is the single source of truth for registered hooks. It is
 * not exposed to plugins directly; plugins interact with it through
 * {@link PluginContext}, which is responsible for injecting `pluginId` and
 * applying crash-isolation wrappers (ADR-004 § Crash Isolation).
 *
 * ## Method semantics
 *
 * - `applyFilters` is **synchronous**. It never awaits. Callbacks that return
 *   a Promise are treated as developer errors by the implementation and the
 *   pre-filter value is returned unchanged.
 * - `doAction` is **asynchronous**. It always returns a `Promise<void>` and
 *   awaits each callback in priority order.
 * - `removeAllByPlugin` is part of the public contract — it is how the plugin
 *   lifecycle (ADR-004) guarantees hook cleanup without relying on plugin
 *   cooperation or callback references.
 */
export interface HookRegistry {
  /** Register a filter under `name`. */
  addFilter<T = unknown, R = T>(name: string, entry: FilterEntry<T, R>): void;

  /** Register an action under `name`. */
  addAction(name: string, entry: ActionEntry): void;

  /**
   * Run all filters registered under `name` synchronously, in priority order,
   * threading `value` through each callback. Returns the final value.
   *
   * **v1 constraint:** `R` is fixed to `T`. Cross-type transformations
   * (`R ≠ T`) are not supported until a concrete use case is documented and
   * approved via ADR. Rationale: a priority chain where intermediate entries
   * produce incompatible types cannot be statically verified at the registry
   * level — the type system cannot express the sequential narrowing across
   * heterogeneous `FilterEntry` instances. Keeping `R = T` eliminates a class
   * of silent runtime mismatches at the cost of one deferred feature.
   */
  applyFilters<T = unknown>(
    name: string,
    value: T,
    ...args: readonly unknown[]
  ): T;

  /**
   * Run all actions registered under `name` in priority order, awaiting each
   * callback. Resolves once every callback has settled; individual failures
   * are contained by the registry (see ADR-004).
   */
  doAction(name: string, ...args: readonly unknown[]): Promise<void>;

  /**
   * Remove every filter and action registered by the given plugin. Called by
   * the plugin lifecycle on deactivation. Idempotent.
   */
  removeAllByPlugin(pluginId: string): void;

  /** Whether at least one filter is registered under `name`. */
  hasFilter(name: string): boolean;

  /** Whether at least one action is registered under `name`. */
  hasAction(name: string): boolean;
}

// ---------------------------------------------------------------------------
// Plugin-facing API
// ---------------------------------------------------------------------------

/**
 * The surface exposed to plugins. Thin facade over {@link HookRegistry} that
 * hides `pluginId` (injected by the framework) and narrows the API to what a
 * plugin is allowed to do.
 *
 * Plugins receive a fresh `PluginContext` on activation (ADR-004). The same
 * instance is used to unregister everything the plugin created when it is
 * deactivated.
 *
 * Extends {@link DisposableRegistry} so that arbitrary resources (timers, open
 * handles, caches) can be registered for cleanup alongside hooks. The lifecycle
 * runtime calls `disposeAll()` after `removeAll()` during deactivation, both
 * subject to the DRAINING timeout (ADR-004).
 */
export interface PluginContext extends DisposableRegistry {
  /** Register a synchronous filter callback. */
  addFilter<T = unknown, R = T>(
    name: string,
    fn: FilterCallback<T, R>,
    priority?: HookPriority,
  ): void;

  /** Register an action callback (sync or async). */
  addAction(name: string, fn: ActionCallback, priority?: HookPriority): void;

  /**
   * Generic alias. Dispatches to {@link addFilter} or {@link addAction} based
   * on `type`. Provided for symmetry with the WordPress `add_hook` idiom used
   * by some ported plugins; prefer the typed variants in new code.
   */
  addHook<T = unknown, R = T>(
    type: "filter",
    name: string,
    fn: FilterCallback<T, R>,
    priority?: HookPriority,
  ): void;
  addHook(
    type: "action",
    name: string,
    fn: ActionCallback,
    priority?: HookPriority,
  ): void;

  /**
   * Remove every hook registered by this plugin. Delegates to
   * {@link HookRegistry.removeAllByPlugin} with the context's own `pluginId`.
   * Called automatically by the lifecycle on deactivation; plugins may also
   * call it for partial self-teardown during reconfiguration.
   */
  removeAll(): void;
}
