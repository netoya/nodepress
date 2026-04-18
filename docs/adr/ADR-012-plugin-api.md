# ADR-012: Plugin API Architecture — `@nodepress/plugin-api`

- **Status:** Accepted
- **Date:** 2026-04-18
- **Accepted:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Co-sign:** Alejandro (product, MIT licensing implication)
- **Related:** ADR-001 (Architecture Overview — § Plugin Loading Strategy), ADR-003 (PHP Compatibility — Tier 1 runtime), ADR-004 (Plugin Lifecycle), ADR-005 (Hook System Semantics), ADR-020 (Plugin Loader Runtime)

## Sprint 3 Scope Addendum

Sprint 3 narrows the Accepted surface deliberately:

- **JS/TS plugins only.** Plugins are TypeScript or JavaScript modules loaded from a local directory. The `WasmPluginLoader` variant anticipated in Open Questions remains a future concern gated by product demand signals.
- **No PHP in Sprint 3.** The Tier 2 php-wasm bridge (ADR-008, ADR-017) is an independent subsystem; this plugin-api ADR does not require it to ship.
- **Runtime behaviour of the loader is formalised in ADR-020.** This ADR commits the type surface and the manifest contract. How activation is scheduled, how the loader discovers plugins on disk, and how `export default function(hooks: HookRegistry)` is invoked are ADR-020's concerns.

**Licensing implication (co-signed with Alejandro):** because plugins are JS/TS modules loaded via `import()` into the NodePress process, the core's MIT licence governs the plugin author's interaction surface. Plugins remain free to choose their own licence. The implication is explicit here so no Sprint 4+ change silently shifts this (e.g. a GPL-licenced core would alter the calculus for proprietary plugin authors).

## Context

The plugin system has two sides:

1. **Plugin-author surface** — `PluginContext`, `DisposableRegistry`, `HookRegistry` wrappers, hook callback types. These live in `@nodepress/core` and were frozen Sprint 1 (tickets #14 / #19 / #20).
2. **Plugin-host surface** — manifest schema, discovery, dynamic loader, vm.Context sandbox, lifecycle state machine. This is what `@nodepress/plugin-api` covers.

Sprint 1 left `packages/plugin-api/src/index.ts` as `export {}`. The host surface cannot stay undefined much longer: (a) the admin panel needs typed plugin records to render the plugin list (Sprint 2), (b) the import-wp CLI command needs a Plugin shape to materialize imported plugins, and (c) the spike on php-wasm (ADR-008) has to return a Plugin-compatible object so the host can treat Tier 2 plugins uniformly with Tier 1.

Declaring the types now preserves two important properties: (i) consumers can code against a stable shape while implementation catches up in Sprint 2, and (ii) the plugin-author surface stays colocated with what a plugin consumes (re-exported from core via plugin-api), so there is a single import path for authors and hosts alike.

This ADR scopes the Sprint 2 implementation work; it is not a record of shipped behaviour.

## Decision

`@nodepress/plugin-api` exposes the manifest, runtime plugin, loader, and lifecycle contracts in `packages/plugin-api/src/types.ts`, and re-exports `PluginContext` and `DisposableRegistry` from `@nodepress/core`.

Public surface:

- **`PluginManifest`** — `{ slug, name, version, description?, main, dependencies?, wpCompat?, engines? }`. `plugin.json` structure, replacing WP's PHP header comments (ADR-001). SemVer is mandatory for `version`. `main` points at the compiled CJS entry (ADR-004 § Plugin Compilation).
- **`PluginActivate`** — `(context: PluginContext) => void | Promise<void>`. Async recommended so the loader can await asynchronous setup before marking the plugin active.
- **`PluginDeactivate`** — `() => void | Promise<void>`. Optional. The framework always runs `context.disposeAll()` on deactivation regardless; this hook is for bespoke teardown.
- **`Plugin`** — `{ slug, name, version, manifest, activate, deactivate? }`. In-memory loaded-plugin record.
- **`PluginStatus`** — `"inactive" | "active" | "draining" | "error"`. Mirrors ADR-004's two-phase deactivation model (active → DRAINING → inactive).
- **`PluginLoader`** — `load(manifest) => Promise<Plugin>`, `unload(slug) => Promise<void>`, `status(slug) => PluginStatus`. The loader validates the manifest, resolves the compiled entry, wraps the plugin in a `vm.Context` sandbox (ADR-003 § Tier 1), and tears everything down on `unload`.
- **`PluginManifestError`** — structural error type with `path` + `issues[]`. Admin-surfaceable.

Dependency on `@nodepress/core` is declared in `package.json` and enforced via TypeScript project reference. `PluginContext` and `DisposableRegistry` are re-exported verbatim so consumers — plugin authors AND plugin hosts — only need a single import path.

Rationale for the key choices:

- **Loader is responsible for the sandbox, not the manifest.** The manifest declares the plugin's intent; the `vm.Context` sandbox is a runtime property of how the loader instantiates it. Keeping the two concerns separate in the type surface means a test harness can load a manifest without a VM, and a future Worker-Threads-per-plugin runtime (post-MVP per ADR-004) slots in by swapping the loader implementation without touching any consumer.
- **`Plugin` carries the original `manifest`.** The admin panel needs to render manifest metadata (description, engines constraints, dependencies) after the plugin is loaded. Storing it once at load time avoids a second filesystem read.
- **`unload` is idempotent.** Lifecycle code runs in error paths where "is this plugin loaded?" is not always knowable. Making `unload` idempotent prevents defensive `if (status === ...)` guards in every caller.
- **`PluginManifestError` is a structural interface, not a class.** The type is what consumers code against; the concrete constructor is an implementation detail of the validator in Sprint 2 and should be swappable (e.g. to Zod-produced errors).

## Open Questions

- **Manifest validator choice.** Zod, Valibot, JSON Schema + ajv, or bespoke? Preference: Zod (already fits the stack), but confirm at Sprint 2 kickoff with the admin team to avoid a second schema library in the frontend bundle.
- **`plugin.json` versioning.** A `schemaVersion` field on the manifest itself to allow future breaking changes? Likely yes — cheap insurance. Defer to Sprint 2 when the validator is picked.
- **Cache-busted dynamic import().** The exact URL format (`?v=<version>&t=<timestamp>` per ADR-004) is documented but not fixed at this type boundary. Spike measuring module cache growth at realistic activation cycles (50+ reactivations) pending in Sprint 2.
- **Tier 2 plugin (php-wasm) loader integration.** Does a `WasmPluginLoader` implement `PluginLoader` to produce a Plugin with a Tier 2–backed `activate` function, or is Tier 2 a separate subsystem behind a shared interface? Preference: same `PluginLoader` interface, different concrete implementation. Confirm after Sprint 1 spike results (ADR-008) feed into the Sprint 2 design session.
- **Plugin dependency resolution.** `dependencies[]` is declared but ordering and cycle detection live in the lifecycle layer, not in `PluginLoader`. Topological sort for the active set will need its own module in Sprint 2.
- **Compiled entry discovery.** Manifest declares `main: "dist/index.cjs"`. Who is responsible for ensuring it exists — the loader (runtime check, clear error), or an earlier install-time gate (`nodepress plugin install` validates at install time)? Currently the runtime-check posture; may tighten in Sprint 2.

## References

- `packages/plugin-api/src/types.ts` — frozen type surface
- `packages/core/src/hooks/context.ts` — `DisposableRegistry` / `PluginContext` definitions re-exported here
- ADR-001 § Plugin Loading Strategy — filesystem layout, manifest replacing PHP headers
- ADR-003 § Tier 1 Native — vm.Context sandbox, only officially supported tier at launch
- ADR-004 § Installation / Activation / Hook Cleanup / Deactivation — full lifecycle semantics
- ADR-005 § Hook System Semantics — `PluginContext.addFilter` / `addAction` asymmetry
- ADR-008 § Tier 2 php-wasm — constraints informing the future `WasmPluginLoader`
