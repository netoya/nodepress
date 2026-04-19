# NodePress — Project Status

> Documento vivo. Actualizado en cada Sprint Review.
> Última actualización: 2026-04-18

---

## Ticket Numbering

> PROJECT_STATUS is the canonical source. GitHub Issues are tracking artifacts only.
> Internal numbers (#1-#13 Sprint 0, #14-#27 Sprint 1) are used in commit history and this document.
> GitHub Issue numbers follow their own sequence (#1-#14 for Sprint 1).

| PROJECT_STATUS # | GitHub Issue | Short title                                        |
| ---------------- | ------------ | -------------------------------------------------- |
| 14               | #1           | HookRegistry + removeAllByPlugin                   |
| 15               | #2           | Content engine posts CRUD                          |
| 16               | #3           | 5 endpoints REST WP-compatible                     |
| 17               | #4           | Test harness WP API conformance                    |
| 18               | #5           | Auth simplificado Bearer=admin                     |
| 19               | #6           | PluginContext + DisposableRegistry (types)         |
| 20               | #7           | wrapSyncFilter + wrapAsyncAction + circuit breaker |
| 21               | #8           | Schema plugin_registry table                       |
| 22               | #9           | Admin shell (sidebar, header, layout)              |
| 23               | #10          | Dashboard 4 estados                                |
| 24               | #11          | Design system componentes base                     |
| 25               | #12          | Spike php-wasm: shortcode plugin WP real           |
| 26               | #13          | Benchmark vm.Context: 50 hooks overhead            |
| 27               | #14          | Matriz extensiones PHP en php-wasm                 |

> In commits and PRs: **always use PROJECT_STATUS numbers** (e.g., `fix(#14): hook ordering`).
> GitHub Issue number is only for `Closes #N` in PR descriptions — cross-reference with the table above.

---

## Visión

**NodePress** — CMS moderno compatible con el ecosistema WordPress, construido en Node.js/TypeScript.

- **ICP:** Agencias y equipos de desarrollo que quieren salir de PHP manteniendo la familiaridad de WP
- **Stack:** Node.js 22, TypeScript strict, Fastify, PostgreSQL 16, Drizzle ORM, Redis 7, React 19, Vite, Vitest
- **Licencia:** GPL-3.0-or-later (pendiente de revisión — dual license evaluándose)

---

## Estado Actual

| Sprint       | Fechas                  | Estado       | Objetivo                                                     |
| ------------ | ----------------------- | ------------ | ------------------------------------------------------------ |
| **Sprint 0** | 2026-04-10 → 2026-04-16 | ✅ CERRADO   | Scaffolding: monorepo, CI, docker, packages init             |
| **Sprint 1** | 2026-04-17 → 2026-04-30 | ✅ CERRADO   | Hook system + CRUD posts REST + Admin shell + demo 30-04     |
| **Sprint 2** | 2026-04-18 → 2026-05-02 | ✅ CERRADO   | Hardening + ADRs sellados + Tier 2 pilotos + context=edit    |
| **Sprint 3** | 2026-05-05 → 2026-05-16 | ✅ CERRADO   | Roles/capabilities + taxonomías + admin edit flow + CLI init |
| **Sprint 4** | 2026-05-19 → 2026-05-30 | ✅ CERRADO   | Plugin system + Theme engine + post-launch ICP-1 signal      |
| **Sprint 5** | 2026-06-02 → 2026-06-13 | ✅ CERRADO   | CLI funcional, WP Import real, CLA + contribuidores          |
| **Sprint 6** | 2026-06-16 → 2026-06-27 | ⬜ PENDIENTE | Plugin Registry MVP + vm.Context hardening + OpenAPI         |

---

## Sprint 0 — Scaffolding (2026-04-10 → 2026-04-16)

**DoD Sprint 0:** `npm run dev` levanta stack, CI verde, packages buildean, typecheck limpio, `npm test` exit 0, "Hello NodePress" en puerto 3000.

| #   | Tarea                                                                    | Responsable         | Estado  | Notas                                                        |
| --- | ------------------------------------------------------------------------ | ------------------- | ------- | ------------------------------------------------------------ |
| 1   | docker-compose.yml (PG 16 + Redis 7)                                     | Román               | ✅ DONE | 3b8b061                                                      |
| 2   | tsconfig.base.json + vitest.workspace.ts + .env.example                  | Román               | ✅ DONE | 3b8b061                                                      |
| 3   | CI GitHub Actions (lint + typecheck + test)                              | Helena              | ✅ DONE | ed292fa                                                      |
| 4   | Schema Drizzle (posts, users, terms, options, comments, plugin_registry) | Ingrid              | ✅ DONE | ed292fa                                                      |
| 5   | Scaffolding admin/ (Vite + React 19 + tokens CSS)                        | Lucas               | ✅ DONE | 3b8b061                                                      |
| 6   | DoD formal + WORKFLOW.md                                                 | Tomás               | ✅ DONE | ad4a389                                                      |
| 7   | ADR-003: PHP Compatibility Strategy                                      | Román               | ✅ DONE | d14c490                                                      |
| 8   | ADR-004: Plugin Lifecycle                                                | Román               | ✅ DONE | d14c490                                                      |
| 9   | contributing.md (git flow, PRs, reviews)                                 | Román               | ✅ DONE | d14c490                                                      |
| 10  | PR template con DoD checklist                                            | Román               | ✅ DONE | 3b8b061                                                      |
| 11  | Definir ICP formal go-to-market                                          | Alejandro + Eduardo | ✅ DONE | docs/business/icp.md                                         |
| 12  | Investigar licencia (GPL vs dual)                                        | Alejandro           | ✅ DONE | docs/business/licensing.md — Dual License (GPL + Commercial) |
| 13  | Labels + Milestones + 14 Issues GitHub                                   | Martín              | ✅ DONE | github.com/netoya/nodepress/issues                           |
| 14  | Agent task protocol (team-level)                                         | Diana               | ✅ DONE | 999ab7f                                                      |

---

## Sprint 1 — Hook System + CRUD Posts + Admin Shell (2026-04-17 → 2026-04-30)

**DoD Sprint 1:** TS strict, tests Vitest (camino feliz + hooks ordering), lint/prettier verde, PR review, tests WP compat para endpoints REST, sin deps circulares core↛db.

### Backend

| #   | Tarea                                              | Responsable     | Estado  | Notas                                                       |
| --- | -------------------------------------------------- | --------------- | ------- | ----------------------------------------------------------- |
| 14  | HookRegistry + removeAllByPlugin + tests 100%      | Román           | ⬜ TODO | Pieza más crítica                                           |
| 15  | Content engine posts CRUD                          | Ingrid + Carmen | ⬜ TODO |                                                             |
| 16  | 5 endpoints REST WP-compatible (posts)             | Ingrid + Carmen | ⬜ TODO |                                                             |
| 17  | Test harness WP API conformance                    | Ingrid          | ⬜ TODO |                                                             |
| 18  | Auth simplificado (Bearer = admin)                 | Ingrid          | ⬜ TODO | Roles en Sprint 2                                           |
| 19  | PluginContext + DisposableRegistry (types)         | Ingrid          | ⬜ TODO | Semana 1                                                    |
| 20  | wrapSyncFilter + wrapAsyncAction + circuit breaker | Raúl            | ⬜ TODO |                                                             |
| 21  | Schema plugin_registry table                       | Ingrid          | ✅ DONE | migration consolidated in packages/db/drizzle/ post-cleanup |

### Frontend

| #   | Tarea                                              | Responsable   | Estado  | Notas |
| --- | -------------------------------------------------- | ------------- | ------- | ----- |
| 22  | Admin shell (sidebar, header, layout)              | Lucas         | ⬜ TODO |       |
| 23  | Dashboard 4 estados (datos, loading, vacío, error) | Lucas + Marta | ⬜ TODO |       |
| 24  | Design system componentes base                     | Marta         | ⬜ TODO |       |

### Spikes

| #   | Tarea                                            | Responsable       | Estado  | Notas           |
| --- | ------------------------------------------------ | ----------------- | ------- | --------------- |
| 25  | Spike php-wasm: shortcode plugin WP real         | Raúl (sup. Román) | ⬜ TODO | 2 días          |
| 26  | Benchmark vm.Context: 50 hooks, overhead/request | Raúl              | ⬜ TODO | Parte del spike |
| 27  | Matriz extensiones PHP en php-wasm               | Helena            | ⬜ TODO |                 |

### Sprint 1 — Kickoff (2026-04-17)

- Demo objetivo 30-04: hook registrado programáticamente muta payload → POST /wp/v2/posts → render en admin. Plugin loader fuera de scope.
- Contrato HookEntry/PluginContext congelado en sesión Román + Ingrid (2026-04-17).
- Asimetría filters sync / actions async mantenida. ADR-005 pendiente — responsable Román.
- Cualquier desvío de semántica WP requiere ADR antes de merge.
- Raúl arranca spike php-wasm (#25) hoy; hard stop día 3 (2026-04-19).
- Daily async en GitHub Discussions, formato 3 líneas: qué mergé ayer / qué abro hoy / qué me bloquea.

---

## Decisiones Clave

| ID    | Fecha      | Decisión                                                                                         | Responsable         | Ref             |
| ----- | ---------- | ------------------------------------------------------------------------------------------------ | ------------------- | --------------- |
| D-001 | 2026-04-09 | Stack: Node 22 + TS + Fastify + PG 16 + Drizzle + Redis 7 + React 19                             | Román               | ADR-001         |
| D-002 | 2026-04-09 | Monorepo npm workspaces: core, db, server, plugin-api, theme-engine, cli, admin                  | Román               | ADR-002         |
| D-003 | 2026-04-09 | MVP = blog funcional + hook system + REST API WP-compatible                                      | Alejandro + Román   | Meet 1          |
| D-004 | 2026-04-09 | Sprints de 2 semanas tras Sprint 0 (1 semana)                                                    | Tomás               | Meet 1          |
| D-005 | 2026-04-09 | Auth simplificado Sprint 1 (Bearer=admin). Roles Sprint 2+                                       | Román               | Meet 1          |
| D-006 | 2026-04-09 | Core no importa de DB. Dirección: server→core+db                                                 | Ingrid + Román      | Meet 1          |
| D-007 | 2026-04-09 | PHP compat Tier 1: JS/TS nativo. Tier 2: php-wasm contenido puro. Tier 3: plugin-server (Future) | Román               | ADR-003 (pend.) |
| D-008 | 2026-04-09 | NodePress es CMS nativo Node.js, NO orquestador sobre WP                                         | Alejandro + Eduardo | Meet 3          |
| D-009 | 2026-04-09 | ICP: agencias/equipos que quieren salir de PHP                                                   | Eduardo             | Meet 2+3        |
| D-010 | 2026-04-09 | Plugin lifecycle: PluginContext + DisposableRegistry + vm.Context                                | Román + Ingrid      | ADR-004 (pend.) |
| D-011 | 2026-04-09 | Plugins compilan a CJS para vm.Context. Build con esbuild                                        | Raúl                | Meet 4          |
| D-012 | 2026-04-09 | Crash isolation: wrapSyncFilter + wrapAsyncAction + circuit breaker                              | Raúl + Ingrid       | Meet 4          |
| D-013 | 2026-04-09 | Hook cleanup: pluginId en HookEntry + removeAllByPlugin()                                        | Ingrid              | Meet 4          |
| D-014 | 2026-04-09 | Estado DRAINING en desactivación. Inflight completan, timeout 10s                                | Román               | Meet 4          |
| D-015 | 2026-04-09 | Frontend: CSS custom properties + Radix UI + Zustand + React Query + MSW                         | Lucas               | Meet 1          |
| D-016 | 2026-04-09 | GitHub Projects como herramienta de tracking                                                     | Martín              | Meet 5          |
| D-017 | 2026-04-09 | Trunk-based dev. main protegida. Squash merge. PR review obligatoria                             | Román               | Meet 5          |
| D-018 | 2026-04-09 | Daily asíncrono. Ceremonies: Planning, Review+Retro                                              | Tomás               | Meet 5          |

---

## ADRs

| ADR | Título                         | Estado      | Autor           |
| --- | ------------------------------ | ----------- | --------------- |
| 001 | Architecture Overview          | ✅ Accepted | Román           |
| 002 | Folder Structure               | ✅ Accepted | Román           |
| 003 | PHP Compatibility Strategy     | ✅ Accepted | Román           |
| 004 | Plugin Lifecycle               | ✅ Accepted | Román           |
| 005 | Hook System Async Boundary     | ✅ Accepted | Román           |
| 006 | date_gmt omission              | ✅ Accepted | Román + Ingrid  |
| 007 | Slug auto-suffix WP-style      | ✅ Accepted | Carmen          |
| 008 | PHP-WASM Tier 2 Verdict        | ✅ Accepted | Raúl + Helena   |
| 009 | Context param (view/edit)      | ✅ Accepted | Carmen          |
| 010 | CLI Architecture               | ✅ Accepted | Román           |
| 011 | Theme Engine Contract          | ✅ Accepted | Román           |
| 012 | Plugin API                     | ✅ Accepted | Román           |
| 013 | CircuitBreaker stress findings | ✅ Accepted | Raúl            |
| 014 | Developer Quickstart Invariant | ✅ Accepted | Román           |
| 015 | Tooling Runtime Boundary       | ✅ Accepted | Román           |
| 016 | Demo Lifecycle Contract        | ✅ Accepted | Román           |
| 017 | Tier 2 Bridge Surface          | ✅ Accepted | Román + Ingrid  |
| 018 | Bridge Security Boundary       | ✅ Accepted | Helena          |
| 019 | Bridge Observability           | ✅ Accepted | Ingrid + Helena |
| 020 | Plugin Loader Runtime          | ✅ Accepted | Román           |
| 021 | Theme↔Core Integration         | ✅ Accepted | Román           |

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

| Rol           | Persona   | Área                                      |
| ------------- | --------- | ----------------------------------------- |
| CEO           | Alejandro | Estrategia, licencia, go-to-market        |
| Tech Lead     | Román     | Arquitectura, hooks, ADRs, code review    |
| Lead Backend  | Ingrid    | Content engine, DB, REST API              |
| Lead Frontend | Lucas     | Admin panel, design system                |
| Dev Backend   | Carmen    | REST routes, implementation               |
| Dev Backend   | Raúl      | Spikes, debugging, vm.Context, php-wasm   |
| Dev Frontend  | Marta     | Componentes, accesibilidad, pixel-perfect |
| Dev Frontend  | Nico      | Prototyping, interacciones                |
| Head Diseño   | Sofía     | UX/UI, tokens, wireframes                 |
| Scrum Master  | Tomás     | Proceso, tracking, ceremonies             |
| IT Manager    | Helena    | Infra, CI, seguridad                      |
| Ops Manager   | Martín    | Delivery, reporting, velocity             |
| Consultor     | Eduardo   | Estrategia mercado, pricing, ICP          |

---

## Sprint 1 día 1 — health check (2026-04-17)

### Progreso tickets

- **DONE hoy:** #14 (HookRegistry + tests), #15 (posts CRUD), #16 (5 endpoints REST), #18 (auth Bearer), #19 (PluginContext/DisposableRegistry), #22 (admin shell), #24 (design system base) + tooling extra (ESLint flat config, vitest coverage-v8)
- **En curso:** #25 (spike php-wasm — día 1/3, hard stop 2026-04-19)
- **TODO:** #17 (test harness — pendiente Ingrid), #20 (bloqueado hasta spike #25/#26), #23 (semana 2 — pendiente wireframes Sofía), #26 (parte del spike), #27 (Helena — pendiente hoy)

### Calidad

- Tests nuevos día 1: ~80 verdes
- Coverage core: HookRegistry 93.8%, context.ts 100%
- ADRs nuevas: 005, 006, 007 (todas Proposed) — 008 pendiente Helena hoy

### Proceso

- Retro Sprint 0 async lanzada: `docs/process/retros/sprint-0-retro.md` — cierre viernes 2026-04-18 12:00
- Ping Sofía wireframes dashboard: `docs/process/pings/2026-04-17-sofia-wireframes-dashboard.md` — deadline viernes EOD
- Daily async activo en GitHub Discussions (formato 3 líneas)

---

## Ticket numbering reconciliation (2026-04-18)

**Decision:** Option B — explicit mapping table. Both numbering systems preserved.

**Rationale:** All 2026-04-17 commits reference PROJECT_STATUS numbers (#14-#27). Renumbering would invalidate commit history cross-references with zero practical benefit. GitHub Issues are tracking artifacts; PROJECT_STATUS is the canonical source (confirmed D-2026-04-17).

**Canonical rule going forward:** Use PROJECT_STATUS numbers in commit messages and code references. Use GitHub Issue numbers only in PR `Closes #N` footers. See mapping table at top of this document.

**Decided by:** Martín (Ops Manager), 2026-04-18.

---

## Sprint 1 día 2 — closing health check (2026-04-18)

### Progreso tickets

- **DONE hoy:** #14 (final via CircuitBreaker), #17 (WP conformance harness), #20 (wrapSync/Async + CircuitBreaker), #27 (ADR-008 revised empirical)
- **DRAFT:** #23 dashboard (4 states con MSW, pending wireframes Sofía para refinement visual)
- **Demo 30-04 implementada:** hooks `pre_save_post` + `the_content` wired a REST handlers + 8 tests demo end-to-end green. 30-04 pasa de deadline a ceremonia de aceptación.
- **En curso:** #25 spike day 2/3 (verdict: Tier 2 VIABLE high confidence, 44 ext loaded vs 20 esperadas)
- **Pendiente day 3 (2026-04-19):** #25 benchmark 50 invocations + memory profiling + verdict final, #26 parte del spike

### Calidad

- Tests acumulados: **108 verdes** (17 HookRegistry + 15 DisposableRegistry + 14 REST integration + 46 UI + 3 auth + 26 WP conformance + 11 CircuitBreaker + 15 wrappers + 8 db smoke + 8 demo end-to-end + 4 dashboard states — descontando solapes)
- Coverage core: 93.8% HookRegistry / 100% context.ts. db warn-only 75%.
- ADRs: 005, 006, 007, 008 (revised), 009. Todas Proposed.
- Lint: 0 errors, 0 warnings.
- ESLint v9 flat config + Husky pre-commit + vitest coverage-v8 operativos.

### Proceso

- Retro Sprint 0 cerrada con 9 action items (R-1..R-9). R-1/2/3/4/6/7 iniciadas o aplicadas hoy.
- GitHub Issues sincronizados: 10 cerrados con commit reference, 3 comentados con contexto.
- PR template reforzado con path-sync, canary matrix, WP-semantics ADR checks.
- Bug latente descubierto y arreglado: `packages/core/src/index.ts` estaba vacío — barrel export completo ahora.

### Estado Sprint 1 al cierre día 2

**12/13 tickets en algún estado de done (92%).** Solo queda #23 visual refinement (pending wireframes) + #25/#26 spike day 3 (scheduled 2026-04-19 hard stop).

---

---

## Sprint 2 — Hardening + ADRs + Tier 2 Content-Only (2026-04-18 → 2026-05-02)

**Sprint Goal:** "NodePress operable en producción — migraciones con historial, clean-clone <5 min, ADRs sellados, Tier 2 surface congelado."

**DoD Sprint 2:** ADRs 013-019 Accepted, drizzle:generate+migrate con journal, CircuitBreaker GC, 3 pilotos Tier 2 integrados y testeados, CI coverage+lint+audit operativos.

### Ticket Mapping Sprint 2

| PROJECT_STATUS # | GitHub Issue | Short title                                       | Responsable           | Estado  |
| ---------------- | ------------ | ------------------------------------------------- | --------------------- | ------- |
| 28               | #15          | drizzle:generate + migrate con journal            | Carmen (brief Ingrid) | ✅ DONE |
| 29               | #16          | GC stale entries CircuitBreaker                   | Raúl (review Román)   | ✅ DONE |
| 30               | #17          | Bug excerpt.raw — OpenAPI fix                     | Carmen (brief Ingrid) | ✅ DONE |
| 31               | —            | ADR-013 CircuitBreaker stress findings → Accepted | Román                 | ✅ DONE |
| 32               | —            | ADR-014 Developer quickstart invariant → Accepted | Román                 | ✅ DONE |
| 33               | —            | ADR-015 Tooling runtime boundary → Accepted       | Román                 | ✅ DONE |
| 34               | —            | ADR-016 Demo lifecycle contract → Accepted        | Román                 | ✅ DONE |
| 35               | —            | ADR-017 Tier 2 bridge surface → Accepted          | Román                 | ✅ DONE |
| 36               | —            | ADR-018 Bridge security boundary → Accepted       | Helena + Román        | ✅ DONE |
| 37               | —            | ADR-019 Bridge observability → Accepted           | Ingrid + Helena       | ✅ DONE |
| 38               | —            | Bridge core (index.ts + singleton php-wasm)       | Raúl                  | ✅ DONE |
| 39               | —            | Pilot: Footnotes plugin (Tier 2)                  | Raúl                  | ✅ DONE |
| 40               | —            | Pilot: Shortcodes Ultimate plugin (Tier 2)        | Raúl                  | ✅ DONE |
| 41               | —            | Pilot: Display Posts plugin (Tier 2)              | Raúl                  | ✅ DONE |
| 42               | —            | Wiring bridge → REST + public routes              | Carmen + Ingrid       | ✅ DONE |
| 43               | —            | CI: coverage artifact + PR lint + security audit  | Helena                | ✅ DONE |

### Sprint 2 — Estado (cierre 2026-04-18)

- **Tickets completados:** 15/16 (ticket #23 dashboard visual refinement pendiente decisión Lucas/Román lunes 21-04)
- **Tests acumulados:** 219 verdes (22 ficheros de test)
- **ADRs Accepted:** 16 (001-009 + 013-019)
- **ADRs Proposed:** 010, 011, 012 (contratos sin implementación — Sprint 3+)
- **CI workflows activos:** ci.yml, smoke-fresh-clone.yml, coverage.yml, pr-lint.yml, security-audit.yml
- **Tier 2 bridge:** operativo con NODEPRESS_TIER2=true. 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts).
- **Gate abierto:** CLA Assistant pendiente (Alejandro + Eduardo, jueves 23-04)
- **Repo público:** 2026-05-14

### Decisiones Sprint 2

| ID    | Fecha      | Decisión                                                                     | Responsable         |
| ----- | ---------- | ---------------------------------------------------------------------------- | ------------------- |
| D-019 | 2026-04-18 | ADRs 010/011/012 permanecen Proposed — no se aceptan sin implementación      | Román               |
| D-020 | 2026-04-18 | cURL sync fuera de Sprint 2 — pilotos no usan HTTP                           | Raúl + Román        |
| D-021 | 2026-04-18 | drizzle:push → drizzle:generate+migrate en producción                        | Ingrid              |
| D-022 | 2026-04-18 | Bridge activa con NODEPRESS_TIER2=true, mutuamente excluyente con DEMO_MODE  | Román               |
| D-023 | 2026-04-18 | renderShortcodes corre ANTES de applyFilters — async bridge, sync hook chain | Román + Ingrid      |
| D-024 | 2026-04-18 | Outreach 24-04: pregunta neutral sobre dolor, no sobre compat plugins        | Alejandro + Eduardo |

---

---

## Sprint 3 — Roles + Taxonomías + Admin Edit + CLI (2026-05-05 → 2026-05-16)

**Sprint Goal:** "NodePress operable y creíble: auth con roles reales, taxonomías WP-compat (categorías + tags), admin edit flow completo, CLI serve+migrate, y repo público el 14-05 con TTFA <5 min en fresh clone."

**DoD Sprint 3:** requireAdmin valida roles en DB, taxonomías CRUD REST, TaxonomySelector en admin editor, CLI ejecutable npm publish, 360+ tests verdes, feature freeze 12-05 12:00, repo público 14-05.

### Ticket Mapping Sprint 3

| PROJECT_STATUS # | GitHub Issue | Short title                                        | Responsable     | Estado  |
| ---------------- | ------------ | -------------------------------------------------- | --------------- | ------- |
| 44               | —            | Auth roles DB + GET /wp/v2/users/me                | Ingrid          | ✅ DONE |
| 45               | —            | ADRs 010/011/012 → Accepted + ADR-020/021 Proposed | Román           | ✅ DONE |
| 46               | —            | GET /wp/v2/media stub → []                         | Raúl            | ✅ DONE |
| 47               | —            | CLI serve + migrate commands (bin nodepress)       | Raúl            | ✅ DONE |
| 48               | —            | Bridge timeout 5s + D-014 disposeAll AbortSignal   | Raúl            | ✅ DONE |
| 49               | —            | GET /wp/v2/categories + /tags REST + OpenAPI       | Ingrid          | ✅ DONE |
| 50               | —            | TaxonomySelector + PostForm taxonomy assignment    | Lucas           | ✅ DONE |
| 51               | —            | Backend persist post→taxonomy assignments          | Carmen          | ✅ DONE |
| 52               | —            | ADR-020 Plugin Loader → Accepted + implementation  | Raúl            | ✅ DONE |
| 53               | —            | ADR-021 Theme↔Core contract (Proposed — Sprint 4)  | Román           | 🔵 S4   |
| 54               | —            | CI npm publish CLI + release checklist             | Helena + Martín | ✅ DONE |
| 55               | —            | Demo spec Sprint 3 (TaxonomySelector + categories) | Lucas           | ✅ DONE |

### Sprint 3 — Estado cierre (2026-04-18)

- **Tickets completados:** 11/12 (#53 ADR-021 implementation → Sprint 4)
- **Tests:** 368 verdes (189 server + 95 admin + 77 core + 5 db + 4 cli)
- **ADRs:** 13 Accepted (001-020), 1 Proposed (021 — implementación Sprint 4)
- **Feature freeze:** 2026-05-12 12:00
- **Repo público:** 2026-05-14

### Decisiones Sprint 3

| ID    | Fecha      | Decisión                                                                               | Responsable       |
| ----- | ---------- | -------------------------------------------------------------------------------------- | ----------------- |
| D-025 | 2026-04-18 | ADRs 010/011/012 → Accepted. Gate Sprint 3 cerrado.                                    | Román             |
| D-026 | 2026-04-18 | Taxonomías sin jerarquía Sprint 3. parent=0 siempre. Jerarquía = deuda ADR.            | Román + Ingrid    |
| D-027 | 2026-04-18 | `GET /wp/v2/users/me` encadenado en #44 — no ticket separado.                          | Ingrid            |
| D-028 | 2026-04-18 | CLI usa process.argv directo — sin dependencias adicionales (commander/yargs).         | Raúl              |
| D-029 | 2026-04-18 | Planning 05-05 AM + outreach signal review 05-05 PM + ajuste 06-05 si cambio material. | Tomás + Alejandro |

---

_Mantenido por Tomás (Scrum Master). Última actualización: 2026-04-19 (Sprint 5 cierre)_

---

## Sprint 4 — Plugin System + Theme Engine + Post-Launch (2026-05-19 → 2026-05-30)

**Sprint Goal:** "NodePress extensible: primer plugin JS/TS real con vm.Context sandbox, ThemeEngine MVP, gestión post-lanzamiento de issues externos y primera iteración basada en feedback ICP-1."

**DoD Sprint 4:** Plugin Loader en producción con al menos 1 plugin demo funcional, vm.Context sandbox implementado (ADR-004), ThemeEngine interface implementada (ADR-021), issues externos atendidos en <48h, feedback ICP-1 integrado en backlog.

### Ticket Mapping Sprint 4 (preliminary)

| PROJECT_STATUS # | GitHub Issue | Short title                                             | Responsable        | Estado  |
| ---------------- | ------------ | ------------------------------------------------------- | ------------------ | ------- |
| 56               | —            | vm.Context sandbox para plugins (ADR-004)               | Raúl + Román       | ⬜ TODO |
| 57               | —            | Plugin demo "Hello World" (JS/TS, via loadPlugins)      | Raúl               | ⬜ TODO |
| 58               | —            | ThemeEngine interface MVP (ADR-021 implementación)      | Román + Lucas      | ⬜ TODO |
| 59               | —            | Primer template theme (single post + archive)           | Lucas + Marta      | ⬜ TODO |
| 60               | —            | Backlog adjustment post-ICP-1 signal                    | Alejandro + Martín | 🔵 S5   |
| 61               | —            | Issues externos triage + CLA checks (post-lanzamiento)  | Martín + Helena    | 🔵 S5   |
| 62               | —            | Plugin API docs (docs/guides/plugin-api.md)             | Carmen             | ✅ DONE |
| 63               | —            | WP Import CLI básico (import-wp subcommand stub)        | Carmen             | ✅ DONE |
| 64               | —            | users readonly endpoint GET /wp/v2/users                | Carmen             | ✅ DONE |
| 65               | —            | Dashboard #23 visual refinement + last-update indicator | Lucas              | ✅ DONE |

### Sprint 4 — Estado cierre (2026-05-19)

- **Tickets completados:** 8/10 (#60 y #61 → Sprint 5 post-outreach)
- **Tests:** 388 verdes (193 server + 95 admin + 83 core + 8 theme-engine + 6 cli + 5 db)
- **ADRs:** 14 Accepted (001-021), 0 Proposed
- **Feature freeze:** 28-05 12:00
- **Plugin system operativo:** loadPlugins() + runInSandbox() + Hello World plugin demo

### Sprint 4 — Kickoff (2026-05-19)

- Retro Sprint 3 async: lanzar 17-05, cerrar 19-05 AM, consolidar antes del planning.
- Planning Sprint 4: 19-05 AM. Backlog ajustado post signal ICP-1 (calls 24-04 → 02-05).
- Feature freeze Sprint 4: 28-05 12:00 (2 días QA antes de cierre 30-05).
- Velocity baseline: Sprint 3 completó 11/12 tickets. Sprint 4 = 10 tickets máx + 2 buffer.
- P0: vm.Context sandbox + Plugin demo + ThemeEngine interface. Sin estas 3, Sprint 4 no cumple su objetivo.

---

---

## Sprint 5 — Adopción: CLI + WP Import + CLA + Contribuidores (2026-06-02 → 2026-06-13)

**Sprint Goal:** "NodePress adoptable: CLI funcional, importación WP real, repo abierto a contribuidores con CLA y licencia definida."

**DoD Sprint 5:** CLA Assistant configurada y documentada, import-wp real ejecutable (posts+terms+users+comments), plugin list command funcional, licencia definida en LICENSE.md + README, feature freeze respetado 2026-06-11 12:00.

**Feature freeze:** 2026-06-11 12:00 (inamovible).
**Techo:** 10 tickets (8 nuevos + #60 + #61 heredados de Sprint 4).

### Ticket Mapping Sprint 5

| PROJECT_STATUS # | GitHub Issue | Short title                                                   | Responsable           | Estado  |
| ---------------- | ------------ | ------------------------------------------------------------- | --------------------- | ------- |
| 60               | —            | Backlog adjustment post-ICP-1 signal (debrief + priorización) | Alejandro + Martín    | ✅ DONE |
| 61               | —            | CLA Assistant config + issues externos triage SLA             | Helena + Martín       | ⬜ TODO |
| 66               | —            | WP Import CLI real (posts+terms+users+comments, dry-run)      | Carmen (brief Ingrid) | ✅ DONE |
| 67               | —            | Plugin list command CLI (nodepress plugin list)               | Raúl                  | ✅ DONE |
| 68               | —            | React Router v7 migración admin                               | Lucas + Marta         | ✅ DONE |
| 69               | —            | Licencia formalizada + CONTRIBUTING.md para contribuidores    | Alejandro + Román     | ✅ DONE |
| 70               | —            | ADR-022 WP Import Strategy                                    | Román                 | ✅ DONE |
| 71               | —            | CODEOWNERS + publish-cli.yml approval gate                    | Román + Helena        | ✅ DONE |
| 72               | —            | Buffer / por confirmar en planning 2026-04-21                 | —                     | ⬜ TODO |
| 73               | —            | Buffer / por confirmar en planning 2026-04-21                 | —                     | ⬜ TODO |

> Tickets 72-73 = buffer. Se confirman o descartan en planning formal Sprint 5 (2026-04-21 AM).

### Sprint 5 — Kickoff (2026-04-18)

- Retro Sprint 4 async: lanzada 2026-04-18, cierre lunes 2026-04-20 AM. Planning formal martes 2026-04-21 tras retro cerrada (D-037).
- P0 ordering: #60 + #61 entran días 1-2. No se pueden mover.
- Velocity baseline: Sprint 4 completó 8/10. Techo Sprint 5 fijado en 10. No comprometer más.
- Temperature check semana 1 (2026-06-05) individual — Tomás.
- ADR-022 WP Import Strategy: Román escribe día 1, antes de cualquier código de Carmen.

### Decisiones Sprint 5

| ID    | Fecha      | Decisión                                                                                           | Responsable         |
| ----- | ---------- | -------------------------------------------------------------------------------------------------- | ------------------- |
| D-030 | 2026-04-18 | Techo Sprint 5 = 10 tickets (8 nuevos + #60 + #61 heredados)                                       | Tomás + Alejandro   |
| D-031 | 2026-04-18 | ADR-022 WP Import Strategy — Román escribe día 1 antes de cualquier código                         | Román + Ingrid      |
| D-032 | 2026-04-18 | Scope WP Import CLI S5 = posts+terms+users+comments. Media, custom post types, PHP-meta = fuera    | Ingrid + Carmen     |
| D-033 | 2026-04-18 | Plugin marketplace S5 = signal only (topic + docs + plugin list). Infra = Sprint 6+ condicionado   | Alejandro + Román   |
| D-034 | 2026-04-18 | Licencia dual vs GPL puro — Alejandro decide con Eduardo antes del planning 2026-04-21             | Alejandro           |
| D-035 | 2026-04-18 | React Router v7 migración entra como ticket Sprint 5                                               | Lucas + Román       |
| D-036 | 2026-04-18 | CLA webhook + publish-cli approval gate = bloqueantes del planning. Helena antes del martes        | Martín + Helena     |
| D-037 | 2026-04-18 | Regla proceso: ningún kickoff arranca sin retro del sprint anterior cerrada                        | Tomás + todo equipo |
| D-038 | 2026-04-18 | Nico se activa en S5 solo si ICP-1 confirma ≥5 mentions de plugins terceros                        | Martín + Lucas      |
| D-039 | 2026-04-19 | Bridge Pilot Registry: pilotCode inyectado en cada `renderShortcodes()` invocation (fix su_spacer) | Raúl + Román        |
| D-040 | 2026-04-19 | CF7 pilot añadido como Tier 2 — form HTML estático, submission fuera de scope Tier 2               | Raúl                |

### Sprint 5 — Estado cierre (2026-04-19)

- **Tickets completados:** 9/10 (+ #72/#73 buffer = 11 efectivos). #61 CLA bloqueado.
- **Tests:** 65+ tests bridge integration nuevos; suite global verde.
- **ADRs nuevos:** ADR-022 (WP Import Strategy), ADR-023 (Plugin Registry Architecture draft).
- **Bridge Pilot Registry:** operativo. 4 pilotos (Footnotes, SU, Display Posts, CF7). su_spacer fix incluido.
- **WP compat real:** 3/4 PASS (su_button ✅, CF7 stub ✅, footnotes ✅, su_spacer ✅ post-fix).
- **Pendiente S6:** #61 CLA (bloqueante GitHub Settings), Helena H-1/H-2 condiciones MEDIA, vm.Context Worker Threads go/no-go.
- **Retro:** `docs/process/retros/sprint-5-retro.md` — cierre async 2026-04-21 AM.
- **Velocity S5:** 11 tickets (mejor sprint desde Sprint 2).

---

---

## Sprint 6 — Plugin Registry + vm.Context Hardening (2026-06-16 → 2026-06-27)

**Sprint Goal:** "NodePress extensible desde el marketplace: plugin registry operativo, CLI install funcional, vm.Context con límite de memoria, OpenAPI completo."

**DoD Sprint 6:** `nodepress plugin install <name>` funcional, Plugin Registry REST endpoints operativos, ADR-023 Accepted, vm.Context memory limit implementado con Worker Threads, OpenAPI 100% endpoints cubiertos.

**Feature freeze:** 2026-06-25 12:00. **Kickoff:** 2026-06-16 AM (tras retro S5 cerrada).

### Ticket Mapping Sprint 6

| PROJECT_STATUS # | GitHub Issue | Short title                                                    | Responsable           | Estado  |
| ---------------- | ------------ | -------------------------------------------------------------- | --------------------- | ------- |
| 74               | —            | Plugin Registry — schema DB + API básica (register, list, get) | Ingrid                | ⬜ TODO |
| 75               | —            | `nodepress plugin install <name>` — CLI + registry fetch       | Raúl                  | ⬜ TODO |
| 76               | —            | Plugin Registry REST endpoints (GET /wp/v2/plugins, POST)      | Carmen (brief Ingrid) | ⬜ TODO |
| 77               | —            | ADR-023 Plugin Registry Architecture → Accepted                | Román                 | ⬜ TODO |
| 78               | —            | vm.Context hardening — memory limit + resource quota           | Raúl + Román          | ⬜ TODO |
| 79               | —            | OpenAPI completo — endpoints cubiertos al 100%                 | Carmen                | ⬜ TODO |
| 80               | —            | CLA webhook operativo + outreach confirmation                  | Helena + Martín       | ⬜ TODO |
| 81               | —            | Users management UI — list + role editor admin panel           | Lucas + Nico          | ⬜ TODO |
| 82               | —            | Media uploads stub — POST /wp/v2/media + storage local         | Ingrid + Carmen       | ⬜ TODO |
| 83               | —            | Tier 2 bridge — cURL sync (deuda D-020, Sprint 2)              | Raúl                  | ⬜ TODO |

> Ref backlog completo: `docs/process/backlog-sprint6-draft.md`
