# ADR-005: Hook System Semantics — Sync Filters, Async Actions

- **Status:** Proposed
- **Date:** 2026-04-17
- **Author:** Román (Tech Lead)

## Context

NodePress's thesis is WordPress ecosystem compatibility (ADR-001). The plugin API surface must feel native to a developer porting a WP plugin — same names, same priorities, same mental model. The hook system is the most exposed part of that surface: `apply_filters` and `do_action` are touched by every non-trivial plugin.

WordPress has a fundamental asymmetry baked into those two primitives:

- **Filters are synchronous.** `apply_filters($tag, $value, ...$args)` returns the filtered value **in the same expression**. Callers chain it inline (`echo apply_filters('the_title', $title);`). Plugin code relies on this — the entire priority-ordered transformation pipeline is composed of synchronous `return` statements.
- **Actions have no return value.** `do_action($tag, ...$args)` is a fire-and-forget notification. In PHP it is synchronous because the runtime is synchronous, but the contract — "no value flows back" — is the part plugins actually depend on.

In Node.js we have a choice. JS can model both sync and async callbacks cleanly. The question is which semantics the NodePress hook registry commits to. The naive option is to make everything async — uniform, future-proof, idiomatic Node. The problem is that it breaks the portability of every WP filter in existence: a filter that was one `return` becomes an `await`-chain, and call sites stop being drop-in.

Alejandro's rule from the Sprint 1 kickoff (2026-04-17) is explicit: **any deviation from WP semantics requires an ADR before implementation.** This ADR documents why NodePress keeps the WP asymmetry intentionally.

## Decision

The NodePress hook registry mirrors WordPress's sync/async split:

| Primitive       | Signature (TS)                             | Execution                                       |
| --------------- | ------------------------------------------ | ----------------------------------------------- |
| `applyFilters`  | `<T, R = T>(name, value: T, ...args) => R` | **Synchronous.** Returns the transformed value. |
| `doAction`      | `(name, ...args) => Promise<void>`         | **Asynchronous.** Always returns a Promise.     |
| Filter callback | `(value: T, ...args) => R`                 | **MUST be sync.** Must not return a Promise.    |
| Action callback | `(...args) => void \| Promise<void>`       | **Sync or async.** Registry awaits.             |

Concrete consequences for implementation:

- `HookRegistry.applyFilters` never `await`s. It iterates priority-ordered filter entries, threads the value, and returns. If a filter callback returns a `Promise`, the registry logs the developer error and returns the pre-filter value unchanged (fail-safe; see ADR-004 § Crash Isolation — `wrapSyncFilter`).
- `HookRegistry.doAction` always returns `Promise<void>`. It iterates priority-ordered action entries and `await`s each callback sequentially. Errors from individual callbacks are contained by `wrapAsyncAction` (ADR-004) and do not abort the chain.
- `PluginContext.addFilter` and `PluginContext.addAction` are distinct methods with different callback signatures at the type level, so misuse is a compile error for TypeScript plugins.
- `PluginContext.addHook` is a typed overload that dispatches to the right registry method based on a `"filter" | "action"` discriminator, provided for symmetry with ported plugins that adopt a generic `add_hook` idiom.

### Frozen contract

See `packages/core/src/hooks/types.ts`. Relevant signatures:

```ts
interface HookRegistry {
  applyFilters<T = unknown, R = T>(
    name: string,
    value: T,
    ...args: readonly unknown[]
  ): R;
  doAction(name: string, ...args: readonly unknown[]): Promise<void>;
  removeAllByPlugin(pluginId: string): void;
  hasFilter(name: string): boolean;
  hasAction(name: string): boolean;
}

type FilterCallback<T = unknown, R = T> = (
  value: T,
  ...args: readonly unknown[]
) => R;
type ActionCallback = (...args: readonly unknown[]) => void | Promise<void>;
```

`HookEntry` is a discriminated union of `FilterEntry` and `ActionEntry`, both carrying `pluginId: string` and `priority: number`. The `pluginId` enables `removeAllByPlugin`, which is the lifecycle-level cleanup primitive defined in ADR-004 — part of the public contract, not an implementation detail.

## Alternatives Considered

### A. Everything async (`applyFilters` returns `Promise<R>`)

Uniform, idiomatic modern Node, trivially supports I/O inside filters.

**Discarded because:**

- Every ported WP filter must be rewritten as `async`. Every call site becomes `await apply_filters(...)`. The porting cost explodes — exactly the cost NodePress exists to avoid.
- The priority ordering contract ("all priority 10 filters run before any priority 11") is preserved, but callers lose the ability to compose filters inline in sync code paths (templating, serializers).
- No WP plugin we have surveyed actually needs async filters. Filters transform values — the canonical use case is `the_content`, `the_title`, `rest_prepare_post`: pure transformations over already-loaded data. Async filters solve a problem that does not exist in the WP plugin corpus.

### B. Everything sync (`doAction` returns `void`)

Uniform in the other direction, trivial to reason about.

**Discarded because:**

- Actions are where plugins do real work: write audit logs, enqueue jobs, emit webhooks, invalidate cache. All of this is I/O. Forcing sync means blocking the event loop on `fs.writeFileSync`, `http.request` with a busy-wait, or shelling out to PHP-WASM. All unacceptable.
- WP itself gets away with sync actions because PHP's process-per-request model absorbs the latency. Node.js is single-process, single-loop — blocking actions are a server-wide outage waiting to happen.

### C. `applyFiltersAsync` and `applyFilters` side-by-side

Offer both, let the caller choose.

**Discarded because:**

- Two APIs for the same concept means every plugin author makes a choice, every code reviewer questions the choice, and the WP compatibility layer has to decide which one to wire `apply_filters` to (there is only one name on the WP side).
- The sync/async split is already the API contract (`applyFilters` vs `doAction`). Adding a third variant is surface-area noise.

## Consequences

### Positive

- **Drop-in portability for WP filter code.** A `function my_filter($v) { return strtoupper($v); }` in PHP maps to `(v: string) => v.toUpperCase()` in JS with no semantic translation.
- **Sync filters stay fast.** No microtask overhead per filter in the hot path (template rendering, REST response serialization).
- **Async is available where it matters.** Actions — webhooks, logging, job dispatch — can `await` without ceremony.
- **Type system enforces the split.** `FilterCallback` and `ActionCallback` are different types; mixing them is a compile error, not a runtime bug.

### Negative

- **Non-uniform API.** Consumers must remember which primitive is sync and which is async. Mitigated by type annotations, examples in the Plugin Development Guide, and a lint rule (future) that flags `await applyFilters(...)`.
- **Filters cannot do I/O.** Intentional, but it is a real limitation for plugins coming from other ecosystems where filters could be async. The migration path for such cases is to refactor the I/O into an action that populates a cache, then read the cache synchronously from the filter.
- **Accidental-async filter risk.** A TS plugin author can still return `Promise<R>` from a filter via an inferred `async` function. Mitigation: `wrapSyncFilter` (ADR-004) detects `Promise` at runtime and logs; we add an ESLint rule in #19 scope to ban `async` filter callbacks statically.

### Implementation Notes

- `HookRegistry.applyFilters` — **never** `await`s, never returns a Promise. The implementation is a tight synchronous loop over a priority-sorted entry list.
- `HookRegistry.doAction` — **always** returns `Promise<void>`. Implementation uses a sequential `for...of` with `await` to preserve priority ordering. Parallel execution is rejected — WP plugins assume priority ordering matches execution ordering, and parallel `Promise.all` would break that.
- Priority ordering: stable sort by `priority` ascending, ties broken by registration order (FIFO). WP uses the same tie-break.
- `removeAllByPlugin` iterates both filter and action maps; idempotent; O(n) in total entries. Acceptable — deactivation is not a hot path.
- Default priority `10` (exported as `DEFAULT_HOOK_PRIORITY`) matches WP.

## References

- [WordPress Plugin API Handbook — Filters](https://developer.wordpress.org/plugins/hooks/filters/)
- [WordPress Plugin API Handbook — Actions](https://developer.wordpress.org/plugins/hooks/actions/)
- [ADR-001: Architecture Overview](./001-architecture-overview.md) — § Hook System Design
- [ADR-004: Plugin Lifecycle](./004-plugin-lifecycle.md) — § Crash Isolation (`wrapSyncFilter`, `wrapAsyncAction`), § Hook Cleanup (`removeAllByPlugin`)
- Meeting log: `meet-2026-04-17-kickoff-sprint-1.md`
- Frozen contract: `packages/core/src/hooks/types.ts`
