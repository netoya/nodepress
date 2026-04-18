# Project Memory — tech-lead-roman @ NodePress

> Decisiones, contexto y aprendizajes específicos de este proyecto.

---

## Decisions

- **2026-04-09:** ADR-001 Architecture Overview — stack definido: Node.js/TS + Fastify + PostgreSQL + Drizzle ORM + React admin. Hook system event-driven con prioridades numéricas WP-compatible.
- **2026-04-09:** ADR-002 Folder structure — monorepo con workspaces: core, plugins, themes, admin, cli.

## Context

- Proyecto en fase PoC. Objetivo: compatibilidad con ecosistema WP (hooks, REST API v2, roles).
- PostgreSQL elegido sobre MySQL: mejor JSON support, better concurrency, extensiones.

## Lessons

- **2026-04-16:** Root `README.md` authored in English. License referenced as
  declared in `package.json` (GPL-3.0-or-later); `docs/business/licensing.md`
  notes dual-license evaluation is open — README links to it instead of
  freezing the decision.
- **2026-04-16:** `allowImportingTsExtensions` is incompatible with
  `composite: true` + emit (which is our setup in `tsconfig.base.json`:
  `declaration`, `declarationMap`, `sourceMap`, `outDir`). TS requires
  `noEmit` or `emitDeclarationOnly` alongside that flag. CI broke in PR #17
  after a previous commit added it "for CI". The flag was unnecessary — zero
  `.ts` imports exist in the repo (imports already use `.js` per NodeNext).
  Removed the flag from `tsconfig.base.json`. Rule: never add tsc flags
  without validating the full semantic implications (emit vs noEmit,
  composite, moduleResolution).

## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 (Román):** docker-compose.yml, tsconfig.base.json, vitest.workspace.ts, .env.example. Días 1-2. CI con Helena días 3-5. **Date:** 2026-04-09
- **Sprint 1 (Román):** Hook system (HookRegistry) en packages/core/src/hooks/ con cobertura 100%. **Date:** 2026-04-09
- **Auth simplificado sprint 1:** Bearer token = admin. Roles WP-compatible en sprint 2+. **Date:** 2026-04-09
- **Core no importa de DB:** Regla arquitectónica no negociable, parte de DoD. **Date:** 2026-04-09
- **Admin sidebar estático sprint 1:** Diseñar protocolo extensión plugins antes de sprint 3. **Date:** 2026-04-09
- **Orden implementación:** db → core → server → plugin-api → theme-engine → cli. Admin en paralelo. **Date:** 2026-04-09
- **vm.Context benchmark:** Necesario antes de sprint 3 (plugin-api). **Date:** 2026-04-09

## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **ADR-001 se mantiene** para runtime core. No hay PHP bridge como arquitectura base. **Date:** 2026-04-09
- **ADR-003 pendiente:** "PHP Compatibility Strategy" — Tier 1 JS/TS nativo, Tier 2 php-wasm (lógica contenido, sin DB), sin Tier 3. A escribir post-spike. **Date:** 2026-04-09
- **Spike php-wasm:** Raúl ejecuta, Román supervisa. 2 días Sprint 1. Shortcode plugin WP real. **Date:** 2026-04-09
- **CLI `nodepress port-plugin`:** En roadmap Sprint 2. Analiza PHP, genera scaffold JS. **Date:** 2026-04-09
- **php-wasm bridge:** Shim PHP intercepta add_action/add_filter → serializa → HookRegistry JS. Doble crossing aceptable para shortcodes (microsegundos WASM). **Date:** 2026-04-09
- **Línea clara Tier 2:** Solo lógica de contenido pura. Sin I/O, sin DB, sin networking. Plugins con DB → portado JS obligatorio. **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server documentado como Tier 3 Future en ADR-003.** No aprobado, no en roadmap activo. **Date:** 2026-04-09
- **Diseño si se activa:** PHP custom mínimo (NO WP core), shims 300 líneas, $wpdb wrapper MySQL, solo acciones (no filtros síncronos), sync PG→MySQL unidireccional. **Date:** 2026-04-09
- **Estimación:** 7-8 semanas senior. No antes de Sprint 3 + demanda enterprise concreta. **Date:** 2026-04-09
- **Bloqueador técnico:** apply_filters síncrono + HTTP no viable. v1 solo do_action (async). **Date:** 2026-04-09
- **Pre-requisitos Helena:** ADR nuevo, threat model, DR coordinado, CVE pipeline. **Date:** 2026-04-09

## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Instalación:** `plugins/` filesystem + `options.active_plugins` (boot) + `plugin_registry` table (admin). **Date:** 2026-04-09
- **Activación sin restart:** `dynamic import()` + cache busting versión+timestamp. Worker Threads solo dev. **Date:** 2026-04-09
- **PluginContext = DisposableRegistry:** Hooks, timers, listeners, connections se registran y limpian automáticamente. Timeout 5s. **Date:** 2026-04-09
- **Hook cleanup:** `pluginId` en HookEntry + `removeAllByPlugin()`. Cleanup incondicional. **Date:** 2026-04-09
- **Crash isolation:** `wrapSyncFilter` (detecta Promise, fail-safe) + `wrapAsyncAction` (try/catch). Circuit breaker auto-desactiva. **Date:** 2026-04-09
- **vm.Context para TODOS los plugins.** 1-3ms overhead aceptable. Uniformidad sobre optimización. **Date:** 2026-04-09
- **Plugins compilan a CJS** para vm.Context. `nodepress plugin build` con esbuild en CLI. **Date:** 2026-04-09
- **Estado DRAINING:** Desactivación no instantánea. Inflight requests completan, timeout 10s. **Date:** 2026-04-09
- **Estado en memoria:** Efímero, no sobrevive restart ni deactivate. Sin globals. **Date:** 2026-04-09

## Meet 2026-04-09 — Flujo de trabajo y documentación

- **Trunk-based dev:** main protegida, feat/NP-XXX branches < 3 días, squash merge. **Date:** 2026-04-09
- **PR review tiered:** core + plugin-api → Román obligatorio. Resto → peer. Max 400 LOC. **Date:** 2026-04-09
- **ADR-003 + ADR-004:** Escribir esta semana (Sprint 0). Antes de Sprint 1. **Date:** 2026-04-09
- **contributing.md + PR template:** Sprint 0 día 1-2. **Date:** 2026-04-09
- **docs/ estructura:** adr/, design/, api/, guides/, status/. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Filters sync, actions async — asimetría WP intencional:** ADR-005 a escribir esta semana. **Why:** compat WP es la tesis; forzar todo a async rompería plugins portados. **How to apply:** mantener la asimetría en HookRegistry y en wrapping de Raúl. **Date:** 2026-04-17
- **Contrato HookEntry + PluginContext.addHook() se congela día 1 con Ingrid:** 30 min sesión post-kickoff. Firma y semántica antes de que Raúl toque #20. **Why:** #14, #19, #20 enlazados — divergencia temprana = rework en cadena. **Date:** 2026-04-17
- **HookEntry forma acordada con Ingrid:** { pluginId, priority, fn }. removeAllByPlugin() parte del contrato público. **Date:** 2026-04-17
- **Raúl primeros 2-3 días = spike php-wasm (#25)** mientras espera contrato para #20. Hard stop día 3 si no hay resultado. **Date:** 2026-04-17
- **Cualquier desvío de semántica WP requiere ADR** antes de implementar. Regla impuesta por Alejandro. **How to apply:** en code review, si detecto desvío sin ADR, bloqueo merge. **Date:** 2026-04-17
- **Testing bar HookRegistry:** 100% coverage, ordering prioridades, removeAllByPlugin, property-based test add→remove→add idempotente. **Date:** 2026-04-17
- **Merge ci/db-migrations-cleanup → main es bloqueante para Sprint 1.** Lo ejecuto yo tras kickoff, squash. **Date:** 2026-04-17

## Sprint 1 día 1 — HookRegistry implementation (2026-04-17)

- **Estructura de datos HookRegistry:** 2 Map<string, Entry[]> separados (filters/actions). Listas ordenadas por priority asc con **inserción estable FIFO** en add\*. Hot path itera data pre-ordenada. **Date:** 2026-04-17
- **Error handling actual = try/catch + console.warn:** un filter/action que lanza no rompe el pipeline. Es placeholder. **Why:** resilience mínima; wrapSyncFilter + wrapAsyncAction + circuit breaker completo llegan con #20 (Raúl). **Date:** 2026-04-17
- **Logger inyectable pendiente:** `console.warn` hoy; abstraer en Sprint 2. TODO inline. **Date:** 2026-04-17
- **Tests 17/17 verdes:** 10 escenarios del brief + variantes (ordering, removeAllByPlugin, idempotencia manual 5 ciclos). `fast-check` no disponible — sustituido por bucle manual. **Date:** 2026-04-17
- **Coverage no medido formalmente:** `@vitest/coverage-v8` no instalado. Helena debe añadirlo junto al flat config ESLint. **Date:** 2026-04-17
- **Factory `createHookRegistry()` expuesta junto con la clase:** permite testing aislado sin estado global. **Date:** 2026-04-17
- **Admin package tests rotos (13 fallos pre-existentes):** `toBeInTheDocument` sin setup `@testing-library/jest-dom`. Ticket para Lucas/Marta — no bloqueo de core. **Date:** 2026-04-17

## Meet 2026-04-18 — equipo continuemos (Sprint 1 semana 2)

- **Scope congelado Sprint 1 — NO abrir Sprint 2 por adelantado:** hardening selectivo + prep quirúrgica. **Why:** 92% done con ritmo x6 es ventana peligrosa para scope creep. **Date:** 2026-04-18
- **/posts list + editor básico entran en Sprint 1** como completude demo: textarea sin bloques. Lucas + Marta. Filtros Martín+Román+Tomás para aprobar. **Date:** 2026-04-18
- **3 tickets hardening backend:** #28 integration tests Postgres real, #29 coverage db INSERT/SELECT/UPDATE, #30 stress circuit breaker concurrent. Ingrid. **Date:** 2026-04-18
- **Skeleton + ADR stub en cli/theme-engine/plugin-api** (3 paquetes con index.ts de 1 línea). Román, antes del viernes 2026-04-24. **Date:** 2026-04-18
- **Protocolo scope freeze activado:** tickets nuevos en Sprint 1 requieren Román + Tomás + Martín. Sin excepción. **Date:** 2026-04-18
- **CLA Assistant jueves 2026-04-23** (90 min Alejandro + Eduardo). Bloquea outreach. **Date:** 2026-04-18
- **Outreach privado arranca viernes 2026-04-24:** 15 calls CTOs ICP-1 con demo grabada, 10 días. Pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" **Date:** 2026-04-18
- **ADRs 005-009 a Accepted antes viernes 24-04.** Sesión asíncrona miércoles. **Date:** 2026-04-18
- **R-2 (contract-freeze) formalizada en apéndice contributing.md** antes lunes 21-04. Tomás. **Date:** 2026-04-18
- **Burndown real cada lunes en GitHub Discussions** desde 21-04. Martín. **Date:** 2026-04-18
- **Messaging A/B test parqueado** a cierre Sprint — un frente abierto cada vez. **Date:** 2026-04-18
- **Temperature check equipo: sin señales burnout hoy** — Tomás sondea cada 3-4 días, no asume que flow = sostenible. **Date:** 2026-04-18

## Sprint 1 sem 2 día 0 — ADRs Accepted + skeletons (2026-04-18)

- **ADR-005 → Accepted (2026-04-18).** Semántica frozen, registry implementado (#14), types congelados. Sign-off propio: yo soy el autor.
- **ADR-009 ya estaba Accepted** (Carmen la creó así al aplicar Option A). Sin cambios.
- **ADR-006/007/008 quedan Proposed hoy:** 006/007 requieren sign-off explícito de Ingrid antes del viernes; 008 esperando verdict spike day 3. No los toco en esta ventana — son decisiones que no me pertenecen solo.
- **3 paquetes vacíos cerrados arquitectónicamente sin implementar:** `packages/cli/`, `packages/theme-engine/`, `packages/plugin-api/` pasan de `export {}` a surface de tipos completa (`types.ts` + `index.ts`). Decisión: commit de contratos ahora = congelar antes de que otros paquetes crezcan shims ad-hoc. Implementación real a Sprint 2+ (cli) / Sprint 3+ (theme-engine). **Date:** 2026-04-18
- **0 deps nuevas añadidas en el skeleton.** Intentional: `commander` o equivalente entra como decisión Sprint 2 con spike empírico, no scaffold-time commitment. Argv parser listado como Open Question en ADR-010. **Date:** 2026-04-18
- **plugin-api depende de @nodepress/core** (package.json + project reference en tsconfig). Re-exporta `PluginContext` + `DisposableRegistry` verbatim — un único import path para plugin authors y plugin hosts. **Date:** 2026-04-18
- **theme-engine deliberadamente desacoplado de core** en esta fase. El `Renderer` aplicará filtros vía `HookRegistry` en Sprint 3, pero cómo recibe la referencia (injection vs context vs singleton) es Open Question — no congelo el acoplamiento hoy. **Date:** 2026-04-18
- **ADR-010 (cli), ADR-011 (theme-engine), ADR-012 (plugin-api) creados en Proposed.** Cada ADR es scoping doc para el Sprint que implementa, no record de shipped behaviour. Estructura coherente con ADRs 005-009: Status, Context, Decision, Open Questions, References. **Date:** 2026-04-18
- **Regla latente:** sprints futuros — nunca dejar un paquete declarado en monorepo con solo `export {}` más de un sprint. Es deuda latente que se convierte en contrato vacuum para los paquetes vecinos. **Date:** 2026-04-18
- **Typecheck 3 paquetes nuevos: verde.** `tsc -b --force packages/cli packages/theme-engine packages/plugin-api` compila limpio. Los 9 errores pre-existentes en `packages/server/src/__tests__` y `routes/posts/__tests__` son de las last waves (demo-end-to-end.test.ts, posts.real-db.test.ts) — no introducidos por este trabajo. Tickets pendientes para Ingrid/Carmen. **Date:** 2026-04-18
