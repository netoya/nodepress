# NodePress — Project Status

> Documento vivo. Actualizado en cada Sprint Review.
> Última actualización: 2026-04-09

---

## Visión

**NodePress** — CMS moderno compatible con el ecosistema WordPress, construido en Node.js/TypeScript.

- **ICP:** Agencias y equipos de desarrollo que quieren salir de PHP manteniendo la familiaridad de WP
- **Stack:** Node.js 22, TypeScript strict, Fastify, PostgreSQL 16, Drizzle ORM, Redis 7, React 19, Vite, Vitest
- **Licencia:** GPL-3.0-or-later (pendiente de revisión — dual license evaluándose)

---

## Estado Actual

| Sprint | Fechas | Estado | Objetivo |
|--------|--------|--------|----------|
| **Sprint 0** | 2026-04-10 → 2026-04-16 | 🔵 PENDIENTE | Scaffolding: monorepo, CI, docker, packages init |
| Sprint 1 | 2026-04-17 → 2026-04-30 | ⚪ PLANIFICADO | Hook system + CRUD posts REST + Admin shell |
| Sprint 2 | 2026-05-01 → 2026-05-14 | ⚪ BACKLOG | Roles/capabilities + taxonomías + CLI port-plugin |
| Sprint 3 | 2026-05-15 → 2026-05-28 | ⚪ BACKLOG | Plugin API + vm.Context + primer plugin ejemplo |

---

## Sprint 0 — Scaffolding (2026-04-10 → 2026-04-16)

**DoD Sprint 0:** `npm run dev` levanta stack, CI verde, packages buildean, typecheck limpio, `npm test` exit 0, "Hello NodePress" en puerto 3000.

| # | Tarea | Responsable | Estado | Notas |
|---|-------|-------------|--------|-------|
| 1 | docker-compose.yml (PG 16 + Redis 7) | Román | ⬜ TODO | Día 1-2 |
| 2 | tsconfig.base.json + vitest.workspace.ts + .env.example | Román | ⬜ TODO | Día 1-2 |
| 3 | CI GitHub Actions (lint + typecheck + test) | Román + Helena | ⬜ TODO | Día 3-5 |
| 4 | Schema Drizzle (posts, users) en packages/db | Ingrid | ⬜ TODO | Día 3-5, depende de docker |
| 5 | Scaffolding admin/ (Vite + React 19 + tokens CSS) | Lucas | ⬜ TODO | Día 1-3 |
| 6 | DoD formal + WORKFLOW.md | Tomás | ⬜ TODO | Día 1 |
| 7 | ADR-003: PHP Compatibility Strategy | Román | ⬜ TODO | Antes de Sprint 1 |
| 8 | ADR-004: Plugin Lifecycle | Román | ⬜ TODO | Antes de Sprint 1 |
| 9 | contributing.md (git flow, PRs, reviews) | Román | ⬜ TODO | Día 1-2 |
| 10 | PR template con DoD checklist | Román | ⬜ TODO | Día 1 |
| 11 | Definir ICP formal go-to-market | Alejandro + Eduardo | ⬜ TODO | Esta semana |
| 12 | Investigar licencia (GPL vs dual) | Alejandro | ⬜ TODO | Antes de repo público |
| 13 | Tablero GitHub Projects | Martín | ⬜ TODO | Hoy |

---

## Sprint 1 — Hook System + CRUD Posts + Admin Shell (2026-04-17 → 2026-04-30)

**DoD Sprint 1:** TS strict, tests Vitest (camino feliz + hooks ordering), lint/prettier verde, PR review, tests WP compat para endpoints REST, sin deps circulares core↛db.

### Backend

| # | Tarea | Responsable | Estado | Notas |
|---|-------|-------------|--------|-------|
| 14 | HookRegistry + removeAllByPlugin + tests 100% | Román | ⬜ TODO | Pieza más crítica |
| 15 | Content engine posts CRUD | Ingrid + Carmen | ⬜ TODO | |
| 16 | 5 endpoints REST WP-compatible (posts) | Ingrid + Carmen | ⬜ TODO | |
| 17 | Test harness WP API conformance | Ingrid | ⬜ TODO | |
| 18 | Auth simplificado (Bearer = admin) | Ingrid | ⬜ TODO | Roles en Sprint 2 |
| 19 | PluginContext + DisposableRegistry (types) | Ingrid | ⬜ TODO | Semana 1 |
| 20 | wrapSyncFilter + wrapAsyncAction + circuit breaker | Raúl | ⬜ TODO | |
| 21 | Schema plugin_registry table | Ingrid | ⬜ TODO | |

### Frontend

| # | Tarea | Responsable | Estado | Notas |
|---|-------|-------------|--------|-------|
| 22 | Admin shell (sidebar, header, layout) | Lucas | ⬜ TODO | |
| 23 | Dashboard 4 estados (datos, loading, vacío, error) | Lucas + Marta | ⬜ TODO | |
| 24 | Design system componentes base | Marta | ⬜ TODO | |

### Spikes

| # | Tarea | Responsable | Estado | Notas |
|---|-------|-------------|--------|-------|
| 25 | Spike php-wasm: shortcode plugin WP real | Raúl (sup. Román) | ⬜ TODO | 2 días |
| 26 | Benchmark vm.Context: 50 hooks, overhead/request | Raúl | ⬜ TODO | Parte del spike |
| 27 | Matriz extensiones PHP en php-wasm | Helena | ⬜ TODO | |

---

## Decisiones Clave

| ID | Fecha | Decisión | Responsable | Ref |
|----|-------|----------|-------------|-----|
| D-001 | 2026-04-09 | Stack: Node 22 + TS + Fastify + PG 16 + Drizzle + Redis 7 + React 19 | Román | ADR-001 |
| D-002 | 2026-04-09 | Monorepo npm workspaces: core, db, server, plugin-api, theme-engine, cli, admin | Román | ADR-002 |
| D-003 | 2026-04-09 | MVP = blog funcional + hook system + REST API WP-compatible | Alejandro + Román | Meet 1 |
| D-004 | 2026-04-09 | Sprints de 2 semanas tras Sprint 0 (1 semana) | Tomás | Meet 1 |
| D-005 | 2026-04-09 | Auth simplificado Sprint 1 (Bearer=admin). Roles Sprint 2+ | Román | Meet 1 |
| D-006 | 2026-04-09 | Core no importa de DB. Dirección: server→core+db | Ingrid + Román | Meet 1 |
| D-007 | 2026-04-09 | PHP compat Tier 1: JS/TS nativo. Tier 2: php-wasm contenido puro. Tier 3: plugin-server (Future) | Román | ADR-003 (pend.) |
| D-008 | 2026-04-09 | NodePress es CMS nativo Node.js, NO orquestador sobre WP | Alejandro + Eduardo | Meet 3 |
| D-009 | 2026-04-09 | ICP: agencias/equipos que quieren salir de PHP | Eduardo | Meet 2+3 |
| D-010 | 2026-04-09 | Plugin lifecycle: PluginContext + DisposableRegistry + vm.Context | Román + Ingrid | ADR-004 (pend.) |
| D-011 | 2026-04-09 | Plugins compilan a CJS para vm.Context. Build con esbuild | Raúl | Meet 4 |
| D-012 | 2026-04-09 | Crash isolation: wrapSyncFilter + wrapAsyncAction + circuit breaker | Raúl + Ingrid | Meet 4 |
| D-013 | 2026-04-09 | Hook cleanup: pluginId en HookEntry + removeAllByPlugin() | Ingrid | Meet 4 |
| D-014 | 2026-04-09 | Estado DRAINING en desactivación. Inflight completan, timeout 10s | Román | Meet 4 |
| D-015 | 2026-04-09 | Frontend: CSS custom properties + Radix UI + Zustand + React Query + MSW | Lucas | Meet 1 |
| D-016 | 2026-04-09 | GitHub Projects como herramienta de tracking | Martín | Meet 5 |
| D-017 | 2026-04-09 | Trunk-based dev. main protegida. Squash merge. PR review obligatoria | Román | Meet 5 |
| D-018 | 2026-04-09 | Daily asíncrono. Ceremonies: Planning, Review+Retro | Tomás | Meet 5 |

---

## ADRs

| ADR | Título | Estado | Autor |
|-----|--------|--------|-------|
| 001 | Architecture Overview | ✅ Accepted | Román |
| 002 | Folder Structure | ✅ Accepted | Román |
| 003 | PHP Compatibility Strategy | 📝 Pendiente | Román |
| 004 | Plugin Lifecycle | 📝 Pendiente | Román |

---

## Roadmap Futuro (post-Sprint 3)

- Theme engine (template resolver, block rendering, asset pipeline)
- CLI completo (serve, migrate, seed, plugin install/build, import-wp, user)
- WP Import/Export tool (MySQL dump → PG)
- `nodepress port-plugin` CLI (PHP→JS scaffold)
- Dark mode admin panel
- Plugin marketplace / registry
- Tier 3 plugin-server (solo si demanda enterprise concreta)

---

## Equipo

| Rol | Persona | Área |
|-----|---------|------|
| CEO | Alejandro | Estrategia, licencia, go-to-market |
| Tech Lead | Román | Arquitectura, hooks, ADRs, code review |
| Lead Backend | Ingrid | Content engine, DB, REST API |
| Lead Frontend | Lucas | Admin panel, design system |
| Dev Backend | Carmen | REST routes, implementation |
| Dev Backend | Raúl | Spikes, debugging, vm.Context, php-wasm |
| Dev Frontend | Marta | Componentes, accesibilidad, pixel-perfect |
| Dev Frontend | Nico | Prototyping, interacciones |
| Head Diseño | Sofía | UX/UI, tokens, wireframes |
| Scrum Master | Tomás | Proceso, tracking, ceremonies |
| IT Manager | Helena | Infra, CI, seguridad |
| Ops Manager | Martín | Delivery, reporting, velocity |
| Consultor | Eduardo | Estrategia mercado, pricing, ICP |

---

_Mantenido por Tomás (Scrum Master). Última actualización: 2026-04-09_
