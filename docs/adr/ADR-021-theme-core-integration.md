# ADR-021: Theme↔Core Integration Contract

- **Status:** Accepted
- **Date:** 2026-04-18
- **Accepted:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-005 (Hook System Semantics — sync filters at render), ADR-011 (Theme Engine Architecture), ADR-020 (Plugin Loader Runtime)

## Context

ADR-011 froze the theme-engine public types but deliberately left the integration contract with `@nodepress/core` and `@nodepress/server` undefined. The relevant Open Question read:

> **Integration with `HookRegistry`.** The renderer will apply `the_content`, `the_title`, and friends. How the renderer gets a handle to the registry (constructor injection? module-level singleton? context object?) is a Sprint 3 decision. The theme-engine types deliberately stay decoupled from `@nodepress/core` today to keep the option open.

Sprint 3 adds public HTML routes served by Fastify that render posts and archives. Those handlers need to hand a template to a renderer and get a string back. They also need hooks like `the_content` to run over the post body before the template consumes it. Without a decision here, every handler invents its own wiring, and Sprint 4 spends a week unwinding accidental coupling.

This ADR formalises the interface and the dependency direction.

## Decision

**The server owns composition. The theme-engine exposes a pure interface. The core stays unaware of either.**

Three commitments:

1. **`ThemeEngine` interface** (added to `packages/theme-engine/src/types.ts`):

   ```ts
   export interface ThemeEngine {
     render(
       templateName: string,
       context: Record<string, unknown>,
     ): Promise<string>;
   }
   ```

   - Async signature at the boundary, even though the underlying `Renderer` primitive is synchronous per ADR-005. The async wrapper gives us room to add per-request data loading in Sprint 4+ (e.g. block-level async data sources) without breaking the handler contract. Sync filters inside a template still run synchronously — this is the same asymmetry ADR-005 already codifies.
   - `templateName` is a theme-level slug (e.g. `"single"`, `"archive"`, `"index"`). Resolution to the actual `Template` is the engine's job, not the server's.
   - `context` is the render-time data bag (post, posts list, archive metadata, site info). Its shape is theme-dependent in v1; Sprint 4 may introduce a discriminated union once we have real themes.

2. **Server injects a `ThemeEngine` into public HTML handlers.** The Fastify app registers one instance at boot via the same plugin-decorator pattern the server already uses for the HookRegistry. Handlers accept it as a dependency, never import it directly. This keeps handlers unit-testable with a stub engine and leaves room to swap the concrete engine (inline for MVP → full engine in Sprint 4) without touching handler code.

3. **Sprint 3 MVP implementation: inline renderer.** A minimal `InlineThemeEngine` ships in `packages/theme-engine/src/inline.ts` and renders post content as a bare HTML shell sufficient to validate the integration. It does **not** support templates keyed by slug — it emits a hardcoded layout for `single` and `archive`. The shape is enough to prove the interface and deliver the Sprint 3 demo; the full loader + template resolver + Gutenberg renderer land in Sprint 4.

**Dependency direction:**

```
@nodepress/core (HookRegistry, PluginContext)   <-- no knowledge of theme-engine
        ^
        |
@nodepress/theme-engine (ThemeEngine interface + InlineThemeEngine impl)
        ^
        |
@nodepress/server (composes them, applies filters via registry before handing data to engine)
```

Core stays pristine (respects the "core no importa de DB, ni de theme-engine, ni de server" invariant already in project memory). The theme-engine package imports from core only to type-reference `HookRegistry` in the impl (not in the public interface), which means a theme-engine consumer that does not want to pull core can still code against the `ThemeEngine` interface.

## Consequences

**Ganamos:**

- Handlers are trivially unit-testable against a stub `ThemeEngine`.
- Sprint 3 ships a working demo without committing to a template language, an asset pipeline, or a Gutenberg pipeline.
- Sprint 4 can swap `InlineThemeEngine` for a real resolver+renderer pair without breaking a single handler.
- The sync/async boundary is explicit: filters stay sync (ADR-005), the engine boundary is async (room for Sprint 4+ async data loading).

**Perdemos:**

- The MVP renderer is deliberately ugly. The demo HTML in Sprint 3 is not presentation-quality; expectations with product must be set accordingly. Martín has been briefed.
- Async `render` at the boundary adds a `Promise` tax on every public HTML request in Sprint 3 even though nothing awaits internally. Overhead is ~microseconds per request, acceptable.
- Template-keyed dispatch is deferred to Sprint 4. Sprint 3 hardcodes two render paths (`single`, `archive`). If a third is needed mid-sprint (e.g. `search`), it lands as another hardcoded path, not a resolver. Documented.

**Riesgos:**

- If Sprint 4's real renderer needs per-request data that was not threaded through `context`, we reopen this ADR and widen the signature. Acceptable — ADRs are revisable when evidence arrives.
- If a plugin registers a filter that makes a filter call async (violating ADR-005), the sync render-time call will not await it. This is the same failure mode ADR-005 already documents; the theme-engine does not make it worse.

## Open Questions

- **Error handling contract.** What does `render` throw on a missing template? A custom `TemplateNotFoundError` subclass or a structured return type (`Result<string>`)? Preference: structured error type in Sprint 4, plain throw in Sprint 3 MVP.
- **Streaming rendering.** ADR-011 noted streaming could be a future middleware. Confirm in Sprint 4 whether the `ThemeEngine` interface grows a `renderStream` variant or whether streaming is a Fastify-reply concern outside this boundary.
- **Multi-theme hosting.** Sprint 3 assumes one active theme. Multi-theme (e.g. admin preview of a draft theme) would require the engine to accept a theme identifier per call or the server to maintain multiple engine instances. Sprint 5+ concern.

## References

- `packages/theme-engine/src/index.ts` — `ThemeEngine` interface + `InlineThemeEngine` implementation
- `packages/theme-engine/src/__tests__/theme-engine.test.ts` — MVP contract tests
- `packages/server/src/routes/public/handlers.ts` — where the engine is instantiated and consumed
- ADR-005 § Hook System Semantics — sync filters at render time
- ADR-011 § Theme Engine Architecture — type surface and rationale
- ADR-020 § Plugin Loader Runtime — plugins register filters that the engine invokes

## Implementation (Sprint 4)

Sprint 4 ships the contract agreed above with the smallest viable footprint. The goal is to validate the integration end-to-end — handlers call `engine.render(...)`, HTML comes out — without committing to a template language, asset pipeline, or resolver.

### What landed

1. **`ThemeEngine` interface** lives in `packages/theme-engine/src/index.ts` (not `types.ts` — co-located with the MVP impl to keep the public entry point single-file for the Sprint 4 iteration; extraction to `types.ts` becomes trivial if a second implementation arrives). Signature is exactly as specified in § Decision:

   ```ts
   export interface ThemeEngine {
     render(
       templateName: string,
       context: Record<string, unknown>,
     ): Promise<string>;
   }
   ```

2. **`InlineThemeEngine`** — the MVP implementation. Dispatches on `templateName` via a `switch`:
   - `"single"` → minimal article HTML wrapper around `{ title, content }`.
   - `"archive"` → minimal `<ul>` of `<a href="/p/:slug">title</a>`.
   - unknown slug → JSON-dumped fallback `<pre>${JSON.stringify(context, null, 2)}</pre>`. The fallback is deliberate: it makes misrouted handlers visible during development instead of silently returning empty HTML.

3. **Server wiring.** `packages/server/src/routes/public/handlers.ts` imports `InlineThemeEngine` from `@nodepress/theme-engine` and instantiates a module-level singleton: `const engine = new InlineThemeEngine()`. `getHome` calls `engine.render("archive", { posts })` and `getPost` calls `engine.render("single", { title, content })` where `content` is the result of the `the_content` filter chain (ADR-005). The engine returns a full HTML document — handlers no longer assemble their own layout, CSS, or markup; they are reduced to data loading + filter application + delegation. The 404 page stays as an inline string in the handler (it is a server-level error response, not a theme concern); Sprint 5 can promote it to a `"404"` template once real templating lands.

4. **Tests.** `packages/theme-engine/src/__tests__/theme-engine.test.ts` covers the three dispatch branches (single renders title, archive renders slugs, unknown returns JSON fallback). `vitest.config.ts` added to the package, `package.json` test script switched to `vitest run`.

### What did NOT land (still deferred per § Decision)

- Fastify decorator-based injection (instantiation is a module-level singleton in `handlers.ts` for Sprint 4). The switch from singleton to decorator is a Sprint 5 concern when a second engine (swap candidate) exists; today there is nothing to swap and the indirection would be premature.
- Template-keyed dispatch beyond `single` and `archive`. A third template (e.g. `search`) would land as a `case` in the switch, not a resolver. Explicitly documented in § Consequences.
- Real renderer (Gutenberg, template files, asset bundling). Sprint 5+.
- Error handling contract (`TemplateNotFoundError` vs `Result<string>`). Sprint 5+ per § Open Questions — the unknown-slug fallback is a deliberate placeholder, not the final contract.

### Trade-offs realised

- **Ganamos:** handlers are now trivially unit-testable against a stub engine; swap path for the real renderer in Sprint 5 is a single-file change (`const engine = new FullThemeEngine(...)`); filter pipeline stays in the handler which keeps the engine stateless and free of core dependencies; the site chrome (CSS, layout) now lives in one place (the engine) instead of being duplicated per handler.
- **Perdemos:** the MVP HTML emitted by `InlineThemeEngine` is intentionally minimal — an integration probe, not presentation-quality output. The richer CSS/layout that previously lived in the handlers is dropped for Sprint 4 and will be re-introduced by the real template system in Sprint 5. Product (Martín) signed off on the temporary presentation regression.
- **Riesgos aceptados:** module-level singleton means every consumer of `handlers.ts` shares the same engine instance — acceptable for the MVP where the engine is stateless; if state ever lands (caches, theme switch hooks), the singleton becomes a liability and we promote to Fastify decorator at that point.
