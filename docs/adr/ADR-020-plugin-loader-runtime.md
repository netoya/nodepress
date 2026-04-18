# ADR-020: Plugin Loader Runtime — File-based JS/TS Discovery

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-004 (Plugin Lifecycle), ADR-005 (Hook System Semantics), ADR-012 (Plugin API — type surface), ADR-014 (Developer Quickstart Invariant), ADR-015 (Tooling Runtime Boundary)

## Context

ADR-012 froze the plugin-api public types (`PluginLoader`, `Plugin`, `PluginManifest`, `PluginStatus`). It did not answer the operational question: **how does a running NodePress process find plugins on disk and initialise them against the `HookRegistry`?** Sprint 3 needs that answer because two concurrent workstreams depend on it — demo-mode hooks need to move out of the server bootstrap and into a real plugin (closing the "demo lives only in server code" debt), and the admin plugin-list view (Sprint 4 precursor work) needs a loader producing `Plugin` records to render.

Constraints that shape the decision:

- **No inter-plugin dependency resolution in Sprint 3.** The `PluginManifest.dependencies[]` field stays declarative only. Topological activation ordering is deferred (ADR-012 § Open Questions).
- **No vm.Context sandbox in Sprint 3.** ADR-004 specifies vm.Context as the Tier 1 sandbox; the Sprint 3 loader runs plugins in the main realm and defers sandboxing to Sprint 4. This is a conscious trade-off: we need the plugin contract exercised end-to-end before the sandbox wrapper closes over it, otherwise we will have to rework both layers simultaneously when the first real plugin exposes a contract gap.
- **Must respect ADR-014 (Quickstart Invariant).** Fresh clone with no plugins present must still boot to the 5-minute TTFA target. The loader treats an absent plugin directory as a valid no-op, not an error.
- **Must respect ADR-015 (Tooling Runtime Boundary).** Plugin runtime lives in Lane A (NodeNext ESM app). TS source plugins rely on the same NodeNext resolution the rest of the core uses — no bespoke transpiler pipeline for Sprint 3.

## Decision

The loader discovers plugins from a directory and initialises each one by invoking a default-exported registration function against the shared `HookRegistry`.

**Discovery:**

- Plugin directory resolved from `NODEPRESS_PLUGINS_DIR` (absolute or cwd-relative). Default: `./plugins` relative to the server process cwd.
- A directory that does not exist is a valid empty-set result. The loader logs a single info-level line and continues. This preserves the Quickstart Invariant (ADR-014).
- Each immediate subdirectory is a candidate plugin. The loader reads `plugin.json` (per ADR-012 `PluginManifest`), resolves `main` relative to the plugin root, and queues the entry for dynamic import.
- A loose `.js` or `.ts` file at the root of the plugins directory is treated as a manifest-less single-file plugin — the file path is both `main` and identity. This supports the demo plugin use case (a single `demo-plugin.ts` without ceremony) without weakening the manifest contract for real plugins.

**Activation contract:**

- Each plugin module must `export default (hooks: HookRegistry, context: PluginContext) => void | Promise<void>`.
- The loader awaits the result. A plugin that rejects moves to `PluginStatus.error` and is skipped for the remainder of the process lifetime (Sprint 3 does not retry). The error is surfaced with plugin slug + stack so operators can diagnose without grepping.
- The loader passes both the registry and a `PluginContext` so plugins can register disposables. Cleanup on unload uses `context.disposeAll()` + `registry.removeAllByPlugin(slug)` per ADR-004 § Hook Cleanup.

**Dynamic import specifics:**

- TS source plugins work under `npm run dev` (tsx) and from compiled output (`dist/*.js`) under `node dist/index.js`. The loader does not transpile; it imports whatever the current runtime can resolve — Lane A for production, tsx-augmented Lane A for dev. This is the same asymmetry ADR-015 already blessed for the server itself.
- Import specifier is `pathToFileURL(absolutePath).href` to satisfy NodeNext's strict ESM resolution (the repeated Sprint 0/1 lesson documented in project memory).
- Cache-busted re-import (hot reload) is **not** in Sprint 3. Activation happens once at boot. Hot reload lands with the vm.Context sandbox in Sprint 4.

## Consequences

**Ganamos:**

- Demo-mode hooks can move out of `packages/server/src/demo/register-demo-hooks.ts` into a real plugin under `plugins/demo-plugin/` — the first dogfood of the loader.
- Plugin authors can write a plugin today with a contract that will survive the Sprint 4 sandbox upgrade (the registration function signature does not change when vm.Context wraps it).
- Quickstart fresh-clone with zero plugins stays green — absent directory is a no-op.

**Perdemos:**

- **No sandboxing in Sprint 3.** A buggy plugin can crash the host process. Acceptable for the demo plugin we control; documented as a sharp edge for any third-party plugin author who tries to ride Sprint 3. Mitigation: the plugin directory ships empty by default, and the demo plugin is opt-in (`NODEPRESS_DEMO_MODE=true` gate is preserved).
- **No dependency graph.** Plugins load in filesystem-listing order. Non-deterministic across platforms. Documented as a known limitation with a pointer to the Sprint 4 topological-sort ticket.
- **No hot reload.** Activation is one-shot at boot. Changing a plugin requires a restart. Acceptable for Sprint 3 demo flows; painful for plugin authors Sprint 4+ must fix.

**Riesgos:**

- If `NODEPRESS_PLUGINS_DIR` resolves to a directory outside the repo (absolute path), the loader will happily load it. This is intended (operators need to point at `/var/lib/nodepress/plugins` in prod) but means Sprint 3 has no containment boundary. Helena's Bridge Security Boundary ADR (ADR-018) addresses the Tier 2 side; a Tier 1 equivalent will be Sprint 4 work once sandboxing lands.
- A plugin that blocks the event loop during activation stalls server boot. Sprint 3 accepts the risk because the only plugin loaded in Sprint 3 is the demo one. Sprint 4 adds an activation timeout wrapper aligned with the circuit breaker pattern (ADR-013).

## Open Questions

- **Plugin identity for single-file plugins.** Sprint 3 uses the filename (minus extension) as slug. Is that stable enough, or do we require `plugin.json` for any plugin the admin panel surfaces? Preference: require `plugin.json` for admin-visible plugins, allow loose files for dev/demo only. Formalise in Sprint 4.
- **Source-map handling for TS plugins.** When a TS plugin throws, the stack should point at the `.ts` source, not the tsx-cached transformation. Confirm behaviour during Sprint 3 integration test.
- **Plugin directory watch mode.** Sprint 4 feature — not a Sprint 3 concern, noted here to avoid it being forgotten.

## References

- `packages/plugin-api/src/types.ts` — type surface this loader implements
- ADR-004 § Plugin Lifecycle — disposable registry, pluginId-scoped cleanup
- ADR-005 § Hook System Semantics — registry methods used by plugins
- ADR-012 § Plugin API Architecture — manifest + Plugin + PluginLoader types
- ADR-014 § Developer Quickstart Invariant — absent plugin directory must not break boot
- ADR-015 § Tooling Runtime Boundary — Lane A NodeNext for plugin runtime
