## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 (Ingrid):** Schema Drizzle para posts y users en packages/db. Días 3-5 (depende de docker-compose de Román). **Date:** 2026-04-09
- **Sprint 1 (Ingrid):** Content engine posts CRUD + 5 endpoints REST WP-compatible + test harness WP API conformance. Carmen ayuda con rutas. **Date:** 2026-04-09
- **Auth simplificado sprint 1:** Bearer token = admin. No implementar roles/capabilities hasta sprint 2. **Date:** 2026-04-09
- **Core no importa de DB:** Regla no negociable. server importa core + db, nunca al revés. **Date:** 2026-04-09
- **Contrato API:** WP REST API Handbook como spec. Lucas mockea contra eso. **Date:** 2026-04-09
- **JSONB typing:** Definir PostMeta, UserCapabilities como interfaces TS estrictas antes de queries. **Date:** 2026-04-09

## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **$wpdb es el bloqueante:** Plugins con SQL directo contra MySQL sin solución viable en PG. **Date:** 2026-04-09
- **Filtros síncronos + PHP:** 5-50ms overhead por IPC crossing. Inaceptable para php-fpm, aceptable para php-wasm en shortcodes. **Date:** 2026-04-09
- **Tier 2 php-wasm:** Solo lógica de contenido. Sin acceso DB. Plugins que necesitan DB → portado JS. **Date:** 2026-04-09
- **CLI port-plugin:** Roadmap Sprint 2. Ingrid + Román definen spec. **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server Tier 3 Future:** No en roadmap activo. Solo si demanda enterprise real. **Date:** 2026-04-09
- **Schema mapping PG→MySQL:** JSONB→EAV es semanas de trabajo. Serialización PHP en Node requerida. **Date:** 2026-04-09
- **Bidireccional descartado v1:** Read-only MySQL para PHP. Plugins que mutan datos (WooCommerce) excluidos. **Date:** 2026-04-09
- **Base recomendada:** PHP custom mínimo con shims, NO WP core stripped. **Date:** 2026-04-09

## Meet 2026-04-09 — Ciclo de vida plugins Node vs PHP

- **Ingrid diseña PluginContext + DisposableRegistry** (types.ts). Sprint 1 semana 1. **Date:** 2026-04-09
- **Hook cleanup:** `pluginId` en HookEntry + `removeAllByPlugin()`. Propuesta de Ingrid adoptada. **Date:** 2026-04-09
- **`plugin_registry` table:** slug PK, name, version, status, activated_at, error_log, meta JSONB. Sprint 1. **Date:** 2026-04-09
- **Dispose timeout:** 5s por plugin. Si cuelga, kill + log + alerta. **Date:** 2026-04-09
- **Filtros sync + Promise detection:** `wrapSyncFilter` devuelve valor sin modificar si callback retorna Promise. **Date:** 2026-04-09
- **Estado DRAINING:** Inflight completan antes de dispose. Timeout 10s. **Date:** 2026-04-09

## Sprint 1 día 1 — contrato de hooks

- **Q1 — HookRegistry recibe FilterEntry construida:** Aprobado sin cambios. `PluginContext` como único inyector de `pluginId` mantiene el invariante de seguridad. Cualquier alternativa que acepte `fn` + `opts` directamente en el registry permitiría construir entries con `pluginId` arbitrario. **Date:** 2026-04-17
- **Q2 — `applyFilters<T, R = T>` cerrado a `R = T` en v1:** Aplicado. El registry no puede verificar coherencia de tipos en una cadena de entries heterogéneas. Silenciosa desviación de tipo en runtime supera el beneficio teórico. Reabierto si aparece caso documentado con ADR. Cambio aplicado en `types.ts` — `applyFilters<T>` devuelve `T`. **Date:** 2026-04-17
- **Q3 — `addHook` en PluginContext:** Mantenido. ADR-005 lo documenta explícitamente como soporte para plugins portados. Alias tipado, coste mínimo, win de compatibilidad real. **Date:** 2026-04-17
- **DisposableRegistry creada en context.ts:** `register(dispose)` + `disposeAll(): Promise<void>`. `PluginContext extends DisposableRegistry`. Re-exportada desde hooks/index.ts. Typecheck verde. **Date:** 2026-04-17

## Sprint 1 día 1 — #17 WP conformance harness

- **Harness location:** `packages/server/src/__tests__/wp-conformance/` — 3 files: `fixtures.ts`, `contract.ts`, `post.contract.test.ts`. **Date:** 2026-04-17
- **contract.ts design:** Pure functions only, no Jest matchers. `assertPostShape`, `assertListShape`, `assertHeaders` — each throws descriptive error (`Missing field \`date\` in post response`). Exportable — can be used by any future test without importing Vitest. **Date:** 2026-04-17
- **Divergence regression coverage:** DIV-001 (no date_gmt/modified_gmt), DIV-002 (rendered objects not plain strings), DIV-003 (absent WP v1 fields), DIV-005 (\_nodepress namespace required). DIV-004 (taxonomies) deferred — no endpoints yet. **Date:** 2026-04-17
- **26 tests, 26 green.** Typecheck clean, ESLint 0 errors, Prettier applied. **Date:** 2026-04-17
- **Bug flag in serialize.ts (Carmen):** `excerpt` field serialized with `raw` key (`{rendered, raw, protected}`) but the OpenAPI spec RenderedField schema only declares `rendered` and `protected` — `raw` is an undocumented extra field. Not a breaking issue but diverges from spec schema. Flagged, NOT fixed — Carmen's ownership. **Date:** 2026-04-17
- **quality-gates.md updated:** Section "## WP Conformance Harness" added to `docs/tooling/quality-gates.md`. **Date:** 2026-04-17

## Sprint 1 día 2 — hooks wiring + demo test

- **HookRegistry singleton exposed via Fastify decorator `app.hooks`:** `packages/server/src/hooks.ts` — `getHookRegistry()` singleton + `registerHooks(app, registry?)` decorator. Optional `registry` param enables per-test isolation without touching the singleton. **Date:** 2026-04-18
- **`@nodepress/core` added to server deps + `packages/core/src/index.ts` populated:** Core had an empty `index.ts` — nothing exported from the package's main entry. Added re-exports of all hooks public API. Built `dist/index.js`. **Date:** 2026-04-18
- **`pre_save_post` filter wired in `createPost` + `updatePost`:** Applied via `request.server.hooks.applyFilters` before every DB write. `createPost` receives full `PostPayload`; `updatePost` receives partial `Record<string, unknown>`. Slug recomputed if title mutated and no explicit slug provided. **Date:** 2026-04-18
- **`the_content` filter wired in `serialize.ts`:** `toWpPost(dbRow, hooks?)` — second param optional, defaults to no-op. Applied to `dbRow.content` before placing in `content.rendered`. All existing callers pass `request.server.hooks`; tests without a real registry pass nothing (no-op default). **Date:** 2026-04-18
- **Demo integration test — 8 tests, 8 green:** `packages/server/src/__tests__/demo-end-to-end.test.ts`. Scenario 1: happy path — `[DEMO]` prefix on title, footer on content, GET re-applies `the_content`. Scenario 2: resilience — busted plugin throws, circuit breaker contains error, post still created, values unmutated. **Date:** 2026-04-18
- **OpenAPI updated:** POST `/wp/v2/posts` notes `pre_save_post`; GET `/wp/v2/posts/:id` notes `the_content`. **Date:** 2026-04-18
- **`docs/process/demo-30-04-plan.md` created:** 3 demo assertions, curl commands, admin panel instructions, fallback. **Date:** 2026-04-18

## Sprint 1 día 2 — smoke:fresh-clone local script (post-mortem action #4)

- **Script:** `scripts/smoke-fresh-clone.ts` — runs via `npm run smoke:fresh-clone` (tsx hoisted from workspace). **Date:** 2026-04-18
- **Port isolation:** server spawned on 3099 (not 3000) to avoid collisions with running dev instance. **Date:** 2026-04-18
- **8 steps end-to-end:** docker check → Postgres container → drizzle:push → dev server spawn → poll / → GET /wp/v2/posts=[] → POST /wp/v2/posts → GET + shape verify (DIV-002 title.rendered, DIV-005 \_nodepress). **Date:** 2026-04-18
- **Errors handled cleanly:** Docker not running, container start failure, drizzle:push non-zero (shows last 800 chars stderr), server boot timeout (shows last poll error), HTTP non-200, missing shape fields. **Date:** 2026-04-18
- **TTFA output example:** `✅ PASS — TTFA 42.3s` (estimated; actual depends on Docker pull cache). **Date:** 2026-04-18
- **Docs:** `docs/tooling/quality-gates.md` extended under "Smoke Fresh-Clone" section with "Local smoke (developer)" subsection including step table and error list. **Date:** 2026-04-18
- **Helena's CI smoke** covers main + PRs (GitHub Actions, TTFA <5min target). This script gives developer local validation <90s before opening PR. Complementary, not duplicate. **Date:** 2026-04-18

## Sprint 1 día 2 — db seeds (2026-04-18)

- **Seed created:** `packages/db/src/seeds/index.ts` — idempotent seed with 1 admin user, 5 posts (3 published/1 draft/1 pending), 3 options. ON CONFLICT DO NOTHING for user/posts, ON CONFLICT DO UPDATE for options. **Date:** 2026-04-18
- **Runner pattern:** same .env auto-load as client.ts (resolve 4 levels up to repo root). Entry-point guard via `argv[1]` match — no side effects on import. **Date:** 2026-04-18
- **`runSeed(db)` exported** — takes a drizzle db instance, returns `{users, posts, options}` counts. Enables Testcontainers idempotency test without spawning a subprocess. **Date:** 2026-04-18
- **Test:** `packages/db/src/seeds/__tests__/seeds.test.ts` — import guard (1 green) + Testcontainers idempotency (skipIf !DOCKER_AVAILABLE). **Date:** 2026-04-18
- **Docs:** `docs/guides/seeding.md` created — contents, run command, reset procedure. **Date:** 2026-04-18

## Session Todos

- move-migrations-to-drizzle: done
- clean-duplicate-migrations: done

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Filters sync, actions async — asimetría WP mantenida:** ADR-005 la documenta Román. **Why:** compat WP es la tesis. **How to apply:** tipos en PluginContext deben reflejar asimetría, no forzar Promise<T> en filters. **Date:** 2026-04-17
- **Orden ataque Sprint 1:** día 1-2 #19 PluginContext types + #18 Auth (paralelos, infra pequeña) → día 2-3 spec OpenAPI → día 3+ Carmen arranca #15+#16 contra spec → #17 test harness corriendo ANTES de endpoints "completos". **Date:** 2026-04-17
- **Spec OpenAPI obligatoria antes de que Carmen toque código:** Carmen es Haiku, ambigüedad en spec = código fuera de WP compat. Yo escribo spec, yo reviso PR. **Date:** 2026-04-17
- **Test harness WP conformance debe correr ANTES de marcar endpoints completos, no después.** **Why:** detectar incompat al final = rework de días. **Date:** 2026-04-17
- **Corrección ruta migración plugin_registry en PROJECT_STATUS:** quedó en packages/db/drizzle/ tras cleanup (no en packages/db/src/). **Date:** 2026-04-17
- **Contrato HookEntry con Román:** { pluginId, priority, fn }. Sesión 30 min post-kickoff para congelar firma. **Date:** 2026-04-17
- **Cualquier desvío de semántica WP requiere ADR.** Aplicable a API design también: si endpoint devuelve shape no-WP, ADR obligatoria. **Date:** 2026-04-17

## Sprint 1 día 1 — Auth + OpenAPI spec (2026-04-17)

- **Token dev default:** `dev-admin-token`, leído con `process.env["NODEPRESS_ADMIN_TOKEN"] ?? "dev-admin-token"`. **Why:** facilita dev local sin .env fijado; prod sin env fijada falla por falta de token real. **How to apply:** `NODEPRESS_ADMIN_TOKEN` obligatorio en staging/prod. **Date:** 2026-04-17
- **requireAdmin como preHandler ruta-a-ruta:** NO global. Rutas públicas (GET /wp/v2/posts, GET /wp/v2/posts/:id) no lo llevan; escritura sí (POST/PUT/DELETE). **Why:** WP REST diferencia lectura pública de escritura autenticada. **Date:** 2026-04-17
- **OpenAPI 3.1 en docs/api/openapi.yaml:** 5 endpoints WP-compat v2 posts. Validado con js-yaml. **Date:** 2026-04-17
- **Divergencia DIV-001 — date_gmt/modified_gmt ausentes:** schema solo `createdAt`/`updatedAt`. REST mapea `date←createdAt`, `modified←updatedAt`, omite `_gmt`. **ADR candidate.** **Date:** 2026-04-17
- **Divergencia DIV-002 — title/content/excerpt planos en DB:** WP REST espera `{rendered, raw, protected}`. La REST layer envuelve al serializar, sin cambio de schema. **Date:** 2026-04-17
- **Divergencia DIV-003 — featured_media, comment_status, ping_status, format, sticky, template inexistentes:** omitidos v1. **ADR candidate** cuando se implementen. **Date:** 2026-04-17
- **Divergencia DIV-004 — taxonomías sin tablas:** documentado en x-nodepress-notes. Sprint 2+. **Date:** 2026-04-17
- **Divergencia DIV-005 — campos extra (type, menuOrder, meta) bajo `_nodepress` namespace:** no contaminan contract WP. **Date:** 2026-04-17

## Sprint 1 día 1 — gap closure (2026-04-17)

- **DisposableRegistryImpl añadida a context.ts:** La interfaz `DisposableRegistry` solo existía como type contract. Se añadió implementación concreta `DisposableRegistryImpl` (clase con `#disposers`, splice atómico para idempotencia, error containment con `console.warn`). Exportada desde `hooks/index.ts`. **Date:** 2026-04-17
- **Tests DisposableRegistry — 15 verdes, 1 todo:** `packages/core/src/hooks/__tests__/DisposableRegistry.test.ts`. Cubre: register sync/async, FIFO ordering, sequential await, error containment (sync throw, async rejection, string throw, object throw), mixed disposers, idempotencia. `context.ts` a 100% cobertura (stmts/branches/funcs/lines). TODO placeholder D-014 por timeout per-disposer (pendiente lifecycle layer #20). **Date:** 2026-04-17
- **ADR-006 — `docs/adr/ADR-006-date-modified-gmt-omission.md`:** Documenta DIV-001. Decisión: omitir `date_gmt`/`modified_gmt`. PG TIMESTAMPTZ ya es UTC — `_gmt` variants serían duplicado de storage. Rollback: derivación trivial en serialize.ts sin migración. Estado: Proposed. **Date:** 2026-04-17
- **ADR-007 — `docs/adr/ADR-007-wp-post-fields-omitted-v1.md`:** Documenta DIV-003. Decisión: omitir `featured_media`, `comment_status`, `ping_status`, `format`, `sticky`, `template` en v1. Cada campo tiene milestone de reintroducción documentado. Alternativa descartada: columnas null-by-default crea superficie de API que luego hay que deprecar. Estado: Proposed. **Date:** 2026-04-17
- **Typecheck + lint:** Verde. `npx tsc --noEmit` sin errores. ESLint 0 errores, 0 warnings en archivos modificados. **Date:** 2026-04-17

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

## Sprint 1 día 2 — #29 db coverage real + ADR sign-off (2026-04-18)

- **Test file created:** `packages/db/src/__tests__/schema.real-db.test.ts` — 13 real-DB tests across 6 tables (posts × 4, users × 2, options × 2, plugin_registry × 2, comments × 1, terms × 1). All guarded by `DOCKER_AVAILABLE=true`. **Date:** 2026-04-18
- **Inline helper pattern:** Testcontainers helpers duplicated inline (not cross-package import) with explicit `// TODO: extract to packages/shared-test-utils` comment. Extraction is out of scope for #29. **Date:** 2026-04-18
- **Integration config for db package:** `packages/db/vitest.integration.config.ts` added. `packages/db/vitest.config.ts` gains `exclude: ["**/*.real-db.test.ts"]` so default run stays unaffected. **Date:** 2026-04-18
- **Setup file:** `packages/db/src/__tests__/setup-integration.ts` sets dummy DATABASE_URL before module load. **Date:** 2026-04-18
- **Root test:integration updated:** Now runs both `packages/server` AND `packages/db` integration configs sequentially. **Date:** 2026-04-18
- **Coverage not measured this session** — Docker unavailable in current execution context. Tests are docker-guarded (`describe.skip` when `DOCKER_AVAILABLE !== "true"`). **Date:** 2026-04-18
- **ADR-006 → Accepted:** Status updated, sign-off footer added + enforcement note on triage process for future plugin compatibility reports. **Date:** 2026-04-18
- **ADR-007 → Accepted:** Status updated, sign-off footer added + reaffirmed rejection of alternative A (null columns before backing system exists). **Date:** 2026-04-18

## Sprint 1 día 2 — #28 Real-DB integration tests

- **Decisión: Opción 1 (Testcontainers, `@testcontainers/postgresql`).** Docker-compose tiene una sola DB `nodepress` sin servicio de test DB separado. Opción 2 requeriría modificar docker-compose y gestionar lifecycle. Testcontainers da aislamiento perfecto sin estado persistente. **Date:** 2026-04-18
- **DB helper:** `packages/server/src/__tests__/helpers/db.ts` — `setupTestDb()` (container + migrate), `truncateAll()`, `teardownTestDb()`, `getTestDb()`. Migration aplicada parseando el SQL en statements delimitados por `--> statement-breakpoint`. **Date:** 2026-04-18
- **Mock pattern:** `vi.doMock('@nodepress/db', ...)` + `vi.resetModules()` + re-mock antes de importar handlers. `@nodepress/db/client.ts` lanza si `DATABASE_URL` no está — `setup-integration.ts` como `setupFiles` pone valor dummy antes de que el módulo cargue. **Date:** 2026-04-18
- **9 tests reales creados** en `posts.real-db.test.ts`: GET list (empty + seeded DIV-002/005), GET by id (404 + DIV-001/005), POST (create + duplicate slug 400), PUT (update + DB verify), DELETE (soft + hard). **Date:** 2026-04-18
- **Exclusión del test run por defecto:** `packages/server/vitest.config.ts` añade `exclude: ["**/*.real-db.test.ts"]`. Script `test:integration` usa `vitest run --root packages/server --config vitest.integration.config.ts`. **Date:** 2026-04-18
- **Tests default: 108 verdes (sin cambio).** Tests integration: 9 tests, pasan cuando Docker disponible. **Date:** 2026-04-18
- **`docs/tooling/quality-gates.md` actualizado** con sección "Real-DB Integration Tests (#28)". **Date:** 2026-04-18

## Meet 2026-04-18 (noche) — Post-mortem e1b7fbf quickstart roto

- **Diagnóstico:** 7 errores en cadena al arrancar desde clean clone. Ninguno detectado en 2 días por CI mockeado. Fallo SISTÉMICO, no personal. **Date:** 2026-04-18
- **Causa raíz arquitectónica:** ADR-001 NodeNext ESM no validó operacionalmente vs drizzle-kit CJS. Los 3 fixes tsconfig Sprint 0 fueron señal recurrente ignorada. **Date:** 2026-04-18
- **Causa raíz táctica:** migration manual `plugin_registry.sql` (Sprint 0 #21) silenció síntoma — sin journal, drizzle-kit no reconocía el dir como snapshot válido. **Date:** 2026-04-18
- **NodeNext se mantiene.** Workaround `NODE_OPTIONS="--import tsx"` para tooling CJS queda documentado en ADR-014. **Date:** 2026-04-18
- **CI verde ≠ proyecto arrancable:** "108 tests verdes" generó falso confort. Coverage sobre mocks no certifica sistema real. **Date:** 2026-04-18
- **Scope freeze NO aplica a hotfix restaurativo:** restaurar invariante ≠ feature nueva. Regla formalizada por Tomás. **Date:** 2026-04-18
- **TTFA (Time to First API Call) <5 min:** métrica operativa oficial desde este meet. Integrada en burndown semanal de Martín. **Date:** 2026-04-18
- **CI `smoke-fresh-clone` es hotfix bloqueante antes del jueves 23-04** (CLA Assistant con Eduardo). Helena ejecuta miércoles 22. **Date:** 2026-04-18
- **ADR-014 "Developer Quickstart Invariant"** — contrato escrito: `git clone && cp .env.example .env && docker-compose up -d && npm i && npm run db:drizzle:push && npm run dev` pasa en cualquier commit main. Román, jueves. **Date:** 2026-04-18
- **ADR-015 "Tooling runtime boundary"** — Sprint 2. Separación runtime / CI / developer tools con contratos explícitos. **Date:** 2026-04-18
- **Sprint 2 ticket:** recuperar `drizzle:generate + migrate` con journal comiteado. Ingrid brief + Carmen ejec. **Date:** 2026-04-18
- **`drizzle:push` es deuda de prod** — historial migraciones perdido hoy para desbloquear. **Date:** 2026-04-18
- **Regla contributing.md:** PRs que tocan packages/db/**, drizzle.config.ts, tsconfig\*, .env.example exigen smoke fresh-clone en PR body. **Date:\*\* 2026-04-18
- **DoD updated:** "Clean-clone test executed, documented in PR body". **Date:** 2026-04-18
- **Señal equipo sana:** 4 de 5 participantes asumieron responsabilidad sin ser forzados. Tomás indicador de madurez. **Date:** 2026-04-18
- **Martín asume fallo de governance:** commit no pasó por trío (Martín+Román+Tomás) pese a protocolo aprobado esa mañana. No se repite. **Date:** 2026-04-18
