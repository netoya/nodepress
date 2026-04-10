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

<!-- To be filled as project progresses -->

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
