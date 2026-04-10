# ADR-004: Plugin Lifecycle

- **Status:** Accepted
- **Date:** 2026-04-09
- **Author:** Román (Tech Lead)

## Context

WordPress PHP has the simplest plugin lifecycle imaginable: every request loads all active plugins, they execute, and PHP dies. The process is stateless by nature — cleanup is free.

NodePress runs a persistent Node.js process. Hooks live in memory. State accumulates. There is no automatic cleanup. The framework must manage the plugin lifecycle explicitly: installation, activation without restart, hook cleanup on deactivation, crash isolation, and in-memory state governance.

This ADR defines how NodePress handles all six lifecycle phases and the mechanisms that guarantee correctness.

## Decision

### Installation

**Filesystem layout:**

```
plugins/
  my-plugin/
    plugin.json     ← manifest (name, version, entry point, dependencies, wpCompat flag)
    index.ts        ← entry point, exports activate() and optionally deactivate()
    node_modules/   ← plugin bundles its own dependencies (no global npm install)
```

**Registry — dual storage:**

| Store | Purpose |
|---|---|
| `options.active_plugins` (autoload: true) | Source of truth for server boot — which plugins to load |
| `plugin_registry` table | Source of truth for admin panel — installed plugins and their state |

```sql
plugin_registry (
  slug          text PRIMARY KEY,
  name          text NOT NULL,
  version       text NOT NULL,
  status        text NOT NULL,  -- 'active' | 'inactive' | 'error'
  activated_at  timestamptz,
  error_log     text,
  meta          JSONB
)
```

These are two different questions: `active_plugins` answers "what do I load on boot?", `plugin_registry` answers "what is installed and in what state?". Merging them would couple boot performance to admin UI concerns.

Plugins bundle their own dependencies. No global `npm install`. This avoids dependency conflicts between plugins and makes each plugin self-contained.

### Activation (no restart required)

The PluginLoader uses `dynamic import()` with cache busting to load a plugin at runtime:

```typescript
const module = await import(`./plugins/${slug}/index.js?v=${version}&t=${Date.now()}`);
await module.activate(context);
```

**Cache busting rationale:** Node.js caches ES modules by resolved URL. The version + timestamp query param produces a unique URL on each activation, bypassing the module cache. The previous module entry remains in memory until GC collects it — acceptable in production where reloads are infrequent. In development, a file watcher triggers clean deactivate/activate cycles.

**Plugin entry point contract:**

```typescript
export async function activate(context: PluginContext): Promise<void>
export async function deactivate?(): Promise<void>  // optional
```

### PluginContext as DisposableRegistry

Every plugin receives its own isolated `PluginContext` instance. This is the plugin's only API surface into the framework.

```typescript
export async function activate(context: PluginContext) {
  // Hooks — registered in HookRegistry AND tracked in context
  context.addAction('save_post', myHandler);
  context.addFilter('the_content', myFilter);

  // Timers — context will clearInterval on dispose
  const interval = setInterval(syncJob, 60_000);
  context.registerTimer(interval);

  // Connections — context will call pool.end() on dispose
  const pool = new Pool(dbConfig);
  context.registerDisposable(pool);
}
```

`PluginContext` maintains an internal registry of everything the plugin creates. On deactivation, `context.dispose()` cleans up automatically and unconditionally:

1. Calls `plugin.deactivate()` if exported — optional hook for custom plugin cleanup
2. `clearInterval` / `clearTimeout` on all registered timers
3. `emitter.off` on all registered event listeners
4. `await disposable.end()` on all registered connections
5. `hookRegistry.removeAllByPlugin(pluginId)` — removes all hooks regardless of reference

**Timeout:** 5 seconds per plugin. If `dispose()` hangs (e.g., a stuck `pool.end()`), it is killed and the failure is logged and surfaced to the admin panel.

**The framework guarantees cleanup.** The plugin developer does not need to track what they registered. `dispose()` runs even if `deactivate()` throws or does not exist.

### Hook Cleanup

ADR-001 defined `removeAction(tag, callback)` and `removeFilter(tag, callback)` using function references. This breaks for anonymous closures — which is how the majority of plugins register handlers.

**Decision:** Add `pluginId` to every `HookEntry` in the `HookRegistry`.

```typescript
interface HookEntry {
  callback: Function;
  priority: number;
  pluginId: string;  // injected automatically by PluginContext
}
```

When a plugin calls `context.addAction('save_post', handler)`, the PluginContext shim injects the `pluginId` transparently. The plugin is unaware of this mechanism.

On deactivation, a single call removes all hooks:

```typescript
hookRegistry.removeAllByPlugin(pluginId);
```

No references needed. No plugin cooperation required. The cleanup is automatic and complete.

### Crash Isolation

**All plugins run inside `vm.Context`.** No dual execution path — uniformity simplifies testing and makes behavior predictable regardless of plugin origin.

**Overhead:** ~5–15µs per boundary crossing, 1–3ms per request with many hooks. Acceptable for a CMS — WordPress generates pages in 200–500ms; NodePress at 50ms including VM overhead is 4–10x faster. Benchmark confirmed in Sprint 1 spike (Raúl, 50-hook plugin).

**Two wrappers for async safety:**

`vm.runInContext` traps synchronous exceptions but unhandled Promise rejections escape the VM context and reach the main process — in Node.js 22, this terminates the process with exit code 1. Wrapping every registered callback prevents this.

```typescript
// For filters — must remain synchronous
function wrapSyncFilter(pluginId: string, fn: Function) {
  return (...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        logger.error({ pluginId }, 'Filter returned Promise — filters must be sync');
        return args[0]; // return value unmodified — fail-safe
      }
      return result;
    } catch (err) {
      logger.error({ pluginId, err }, 'Plugin filter error');
      return args[0]; // return value unmodified
    }
  };
}

// For actions — async is safe, no return value
function wrapAsyncAction(pluginId: string, fn: Function) {
  return async (...args: unknown[]) => {
    try {
      await fn(...args);
    } catch (err) {
      logger.error({ pluginId, err }, 'Plugin action error');
      // error contained — does not propagate
    }
  };
}
```

Filters that return a Promise are detected immediately and the value passes through unmodified. This preserves the synchronous filter contract from ADR-001 while preventing silent data corruption.

**Circuit breaker:** A plugin that throws more than N errors in T time is automatically deactivated. The threshold is configurable. The admin panel is notified.

**Documented limitation (MVP):** `vm.Context` does not isolate CPU. A plugin executing `while (true)` blocks the event loop. Mitigation path: Worker Threads per plugin (post-MVP). This limitation is documented in the Plugin Development Guide.

### Deactivation

Deactivation follows a two-phase protocol:

**Phase 1 — DRAINING state:**
- Plugin state transitions to `DRAINING`
- No new hook executions are accepted for this plugin
- In-flight executions (async actions doing I/O) are allowed to complete
- Maximum drain timeout: 10 seconds

**Phase 2 — Dispose:**
- `context.dispose()` runs (see PluginContext section)
- Runs unconditionally — even if the plugin is in error state or `deactivate()` throws
- Plugin state transitions to `inactive` in `plugin_registry`
- Slug removed from `options.active_plugins`

For synchronous filters (`applyFilters`), mid-execution deactivation risk is minimal — execution is O(microseconds) and the callback completes before dispose runs.

### In-Memory State

Plugins may maintain in-memory state. This is a feature, not a bug — it enables caches, rate limiters, WebSocket connection tracking, and other patterns impossible in PHP's stateless model.

**Rules:**

| Rule | Constraint |
|---|---|
| Ephemeral | State does not survive a server restart |
| Non-persistent | Persistence requires DB or Redis via the PluginContext API |
| Isolated | `vm.Context` prevents plugins from sharing globals |
| Lifecycle-bound | State is destroyed with the PluginContext on deactivation |

### Plugin Compilation

Plugins are written in TypeScript and compiled to **CommonJS (CJS)** for execution in `vm.Context`.

`vm.Module` (ESM support) is experimental in Node.js 22 and not production-safe. CJS is the reliable choice.

Build toolchain: `esbuild` via the NodePress CLI.

```
nodepress plugin build   ← compiles plugin TypeScript to CJS (Sprint 2)
```

The compiled entry point is declared in `plugin.json`. The runtime loads the compiled artifact, not the TypeScript source.

## Consequences

### Positive

- **Activation without restart.** Plugins can be activated and deactivated at runtime — no downtime.
- **Guaranteed cleanup.** The framework disposes all plugin resources regardless of plugin developer behavior. No manual cleanup required.
- **Crash isolation active.** A failing plugin does not take down the server. Errors are contained, logged, and circuit-broken.
- **Uniform execution path.** All plugins run in `vm.Context` — no dual path to test or maintain.
- **Async safety.** Two-wrapper approach prevents async errors from escaping the VM boundary.

### Negative

- **`vm.Context` overhead.** ~5–15µs per boundary crossing, 1–3ms per request with many hooks. Acceptable for a CMS but not zero-cost.
- **`vm.Context` does not isolate CPU.** A plugin with a blocking loop (`while true`) halts the event loop. Worker Threads would solve this but are out of scope for MVP.
- **Plugins must compile to CJS.** Adds a build step to the plugin development workflow. Mitigated by `nodepress plugin build` CLI command in Sprint 2.

### Mitigations

- VM overhead confirmed acceptable via benchmark spike (Raúl, Sprint 1) — 50-hook plugin, real request load.
- CPU isolation limitation documented in Plugin Development Guide. Worker Threads tracked as post-MVP evolution.

## References

- [ADR-001: Architecture Overview](./001-architecture-overview.md)
- [Node.js vm module documentation](https://nodejs.org/api/vm.html)
- [Node.js dynamic import() and module cache](https://nodejs.org/api/esm.html)
- Meeting log: `20260409-ciclo-vida-plugins-node-vs-php.md`
