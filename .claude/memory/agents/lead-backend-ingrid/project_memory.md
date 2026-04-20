## Mini-Sprint M3/M4/M7 — Execution (2026-04-20)

- **M7 seeds done:** 6 rows added to `seedOptions()` with `ON CONFLICT DO NOTHING` and `autoload: true`. Updated `runSeed` return count to 9 options. **Date:** 2026-04-20
- **M4 Users CRUD done:** `GET /:id` public (toWpUserPublic), `POST` (bcrypt cost 12, ADR-026), `PUT` (conditional hash rotation — `"password" in body` guard), `DELETE` with transaction + reassign. All 4 new handlers in `packages/server/src/routes/users/index.ts`. Password service at `packages/server/src/services/password.ts`. **Date:** 2026-04-20
- **M4 /me route registration order fixed:** `/wp/v2/users/me` registered BEFORE `/:id` — Fastify would otherwise treat "me" as an integer param. **Date:** 2026-04-20
- **M4 DELETE semantics:** Without `?reassign` and user has posts → 409 USER_HAS_CONTENT. Without `?reassign` and no posts → hard delete. With `?reassign=<id>` → db.transaction() UPDATE posts + DELETE user. **Date:** 2026-04-20
- **M4 tests:** 6 real-db cases in `packages/server/src/routes/users/__tests__/users.real-db.test.ts`. Pattern: Testcontainers + vi.doMock + vi.resetModules same as posts.real-db.test.ts. **Date:** 2026-04-20
- **M3 serialize.ts:** Added `parent` and `menu_order` at root of toWpPost and toWpPostAsync return objects. Also added to PostSchema response schema. WP-compat root fields. **Date:** 2026-04-20
- **M3 tests:** 8 WP-conformance cases in `packages/server/src/routes/pages/__tests__/pages.real-db.test.ts`. Covers: parent, menu_order update, slug collision (posts table shared → 409 on explicit slug), context=edit, type isolation, 404, nullable parentId, status isolation. **Date:** 2026-04-20
- **M3 OpenAPI:** `Page` schema added. 5 endpoints documented under `Pages` tag in `docs/api/openapi.yaml`. **Date:** 2026-04-20
- **Pre-existing test failures not introduced by M3/M4/M7:** 11 failures in npm test were already present before this session (verified via git stash). Contract tests fail due to mock DB issues from prior sprint. **Date:** 2026-04-20
- **@types/bcrypt installed:** Added as devDependency in packages/server. **Date:** 2026-04-20

## Planning Mini-Sprint Pages/Users/Settings — 2026-07-14

- **PageSchema acordado:** extiende PostSchema con `parent` integer nullable y `menu_order` integer default 0, AMBOS en root. Contrato cerrado con Lucas. **Date:** 2026-07-14
- **Handler factory en M2:** `createPostHandler(postType)` en `handler-factory.ts` nuevo. `listPosts` filtra por `type` en M2 — sin fix, GET /wp/v2/posts devuelve pages. Deuda activa. **Date:** 2026-07-14
- **`authorId` hardcodeado corregir en M2:** usar `request.user.id`. **Date:** 2026-07-14
- **M4 distribución:** Ingrid = GET/:id + POST (bcrypt, coordinación Helena). Carmen = PUT + DELETE. **Date:** 2026-07-14
- **DELETE users con db.transaction():** reasignar posts ANTES de borrar. Sin transacción = riesgo FK. No negociable. **Date:** 2026-07-14
- **Tests M4 con Testcontainers:** patrón real-db, no mocks manuales. **Date:** 2026-07-14
- **Tests WP-conformance pages los escribe Ingrid:** 8 casos mínimos. **Date:** 2026-07-14
- **Settings JSONB serializer:** extraer valor escalar nativo. Constraint explícito en brief de M6. **Date:** 2026-07-14
- **Helena gate M4:** Ingrid tiene M4 en revisión para el miércoles EOD si M5 está cerrado antes del mediodía del lunes. **Date:** 2026-07-14
- **M7 seeds:** 6 rows a seed existente con ON CONFLICT DO NOTHING. Idempotente por diseño. **Date:** 2026-07-14

## Meet 2026-04-19 — Flujos sin cobertura — bridge PHP-WASM

- **Mock de runtime completo = ilusión de cobertura:** `simulateBridgeWithFootnotes` mide reimplementación JS, no PHP real. Patrón activamente dañino — si modificas el PHP, los tests siguen verdes. **Date:** 2026-04-19
- **Acción #4: test REST con `NODEPRESS_TIER2=true`:** Añadir describe en `posts.real-db.test.ts` con `process.env.NODEPRESS_TIER2 = "true"` activando bridge real en handler. Plazo: 2026-04-22. **Date:** 2026-04-19
- **Escaping en template strings PHP es el mayor riesgo activo:** Cuatro niveles de escaping en juego (JS string → PHP double-quoted → JSON.stringify → PHP json_decode). Cualquier fix puede introducir otro bug sin que los tests lo detecten. **Date:** 2026-04-19
- **Co-sign amendment ADR-014 condicionada:** El amendment debe especificar explícitamente qué env vars activan qué flows en CI y cuál es el smoke mínimo por flow. **Date:** 2026-04-19
- **Acción #10 (Sprint 8): auditoría "qué mockea cada suite"** por módulo (bridge, plugin-loader, theme-engine). Identifica falsos verdes sistémicos. **Date:** 2026-04-19

## Meet 2026-04-18 — Kickoff Sprint 5

- **Bug activo: paginación en memoria GET /wp/v2/users:** La query carga toda la tabla y pagina en JS. Fix: `db.select().from(users).limit(perPage).offset((page-1)*perPage)`. Carmen cierra como hotfix 2026-04-18. Patrón: igual que /categories. **Date:** 2026-04-18
- **D-032 Scope WP Import CLI Sprint 5:** posts publicados + terms + users + comments. Media/attachments fuera. Custom post types fuera (log warning). Serialización PHP meta fuera (skip + advertencia). Idempotencia obligatoria. **Date:** 2026-04-18
- **Bug: PUT /wp/v2/posts no aplica taxonomías:** Creación OK (Sprint 3), actualización inconsistente. Carmen incluye el fix como subtarea del ticket WP Import CLI. **Date:** 2026-04-18
- **OpenAPI a actualizar Sprint 5 semana 1:** Incluir taxonomías, users/me, context=edit (ADR-009). Contribuidores externos necesitan contrato claro. **Date:** 2026-04-18
- **ADR-022 WP Import Strategy:** Román lo escribe día 1 de Sprint 5. Ingrid valida el scope y las exclusiones. **Date:** 2026-04-18

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

## Sprint 1 día 2 — Tier 2 Bridge ADR-017 (2026-04-18)

- **Bridge module created:** `packages/server/src/bridge/index.ts` — singleton PHP-WASM runtime, input validation, bootstrap with ADR-018 security stubs (exec/shell/curl/mail/wp*mail/file_put_contents/fwrite + wp_remote*\* stubs), shortcode engine (add_shortcode/do_shortcode/shortcode_atts), WP Options API (get_option/update_option via pluginConfig), WP Posts API (get_post/get_posts via candidatePosts). **Date:** 2026-04-18
- **Observability (ADR-019):** `emitSpan` with `BridgeSpan` shape (event, trace_id, invocation_id, plugin_id, shortcode_tag, duration_ms, input_size_bytes, output_size_bytes, error_code, warnings_count, timestamp) + level field. console.log(JSON.stringify) in Sprint 2. **Date:** 2026-04-18
- **Singleton pattern:** `getPhpInstance()` lazy init, `destroyBridge()` teardown, `@php-wasm/node` loaded via dynamic import with `emscriptenOptions: { processId: process.pid }`. If init fails → BRIDGE_INIT_FAILED + passthrough. **Date:** 2026-04-18
- **registerBridgeHooks:** registers a sync no-op FilterEntry for `the_content` at priority 9 under BRIDGE_PLUGIN_ID="tier2-bridge". Heavy async PHP work done OUTSIDE applyFilters (ADR-005 intact). **Date:** 2026-04-18
- **Tests:** 8 tests in `packages/server/src/bridge/__tests__/bridge.test.ts`. All 156 project tests green. @php-wasm/node and @php-wasm/universal mocked with vi.mock. **Date:** 2026-04-18
- **ADR-017 → Accepted:** Co-signed by Ingrid. Status updated in `docs/adr/ADR-017-tier2-bridge-surface.md`. **Date:** 2026-04-18
- **Key pattern for timeout test:** Don't use fake timers with hanging promises. Instead, have mockRunFn throw `new Error("BRIDGE_TIMEOUT")` to exercise the catch branch that maps to the error code. **Date:** 2026-04-18
- **PHP bootstrap escaping:** postContent escaped for PHP double-quoted strings (backslash, quote, dollar, CR, LF). candidatePosts and pluginConfig serialized as JSON injected into PHP code. **Date:** 2026-04-18

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

## Meet 2026-04-18 (noche) — Mapa compatibilidad PHP-WASM + Node

- **Mapa de 15 áreas archivado como catálogo, NO backlog.** Alejandro + Román co-sign ADR de archivado. **Date:** 2026-04-18
- **D-008 reafirmado:** NodePress = CMS nativo Node, NO orquestador WP. El mapa entero lo contradice. **Date:** 2026-04-18
- **Tier 2.0 subset mínimo** — lo que los 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts) ejercitan empíricamente. Raúl spike day 4-6 lo determina. Hard stop lunes 2026-04-22. **Date:** 2026-04-18
- **Tier 3 Full rechazado.** Reconsiderable solo con demanda validada + budget + ≥3 señales outreach plugins Anti-ICP. **Date:** 2026-04-18
- **ADR-017 "Tier 2 Bridge Surface"** — Román escribe tras verdict Raúl. Freeze del surface antes de Sprint 2 kickoff. **Date:** 2026-04-18
- **ADR Bridge Security Boundary** — Helena, antes jueves 24. Gate obligatorio antes de cualquier Tier 2.0 en prod. **Date:** 2026-04-18
- **ADR Bridge Observability** — cada bridge call = span tracerable. Helena, Sprint 2 week 1. **Date:** 2026-04-18
- **cURL sync bloquea event loop** — constraint documentado. HTTP calls en Tier 2.0 requieren async wrapper antes de prod. **Date:** 2026-04-18
- **$wpdb fuera de scope indefinidamente.** No es debate técnico pendiente, es decisión producto. JSONB↔EAV + MySQL bridge = semanas con ROI negativo. **Date:** 2026-04-18
- **Filesystem/Uploads Sprint 3+** — implementación solo cuando piloto lo pida. MinIO en compose solo si se aprueba. **Date:** 2026-04-18
- **Outreach viernes 24-04** pregunta explícita "¿qué plugins PHP usan HOY?" (no wishlist). 3 señales Anti-ICP independientes reabren mapa en Sprint 4 planning. **Date:** 2026-04-18
- **Benchmark competitivo usado como ancla:** Ghost $5M ARR cero compat WP, Strapi 61k stars cero compat, wp-now proyecto Automattic interno nunca comercializado. Ningún CMS comercial gana vía compat. **Date:** 2026-04-18

## Meet 2026-04-18 (noche sesión 2) — Reabrir mapa PHP-WASM tras push-back del PO

- **Archivado revocado.** Nuevo ADR "Phased WP Bridge Roadmap" reemplaza el archivado anterior. 3 fases con criterios explícitos. **Date:** 2026-04-18
- **Reconocimiento compartido:** consenso interno ≠ señal de mercado. El PO aportó info que el equipo no tenía. No fue decisión equivocada — fue insuficiente. **Date:** 2026-04-18
- **Contraejemplo Faust.js + WPGraphQL** (WP Engine, 400k+ sites) valida compat parcial estratégica. Eduardo retiró generalización "ningún CMS gana vía compat" → aplica solo a full compat. **Date:** 2026-04-18
- **Fase A (Sprint 2-3):** Options R/W, Transients, Object Cache, Users inyectable, `$_SERVER`, lifecycle reset, hooks cross-runtime. ~8 días Carmen+Ingrid. **Date:** 2026-04-18
- **Fase A dividida:** subset Sprint 2 (Options R/W + hooks + `$_SERVER`) + completion Sprint 3 (Users + Cache + Transients + lifecycle) — protege scope freeze Sprint 2. **Date:** 2026-04-18
- **Fase B (Sprint 4-5):** HTTP async wrapper con Worker Threads, cookies context bridge, sessions store. Gated por ≥5 sí en outreach. **Date:** 2026-04-18
- **Fase C (Sprint 6+):** `$wpdb` proxy, FS virtual + S3/MinIO, Uploads. Gated por piloto pagando. **Date:** 2026-04-18
- **Tier 3 full orquestador WP: RECHAZADO PERMANENTEMENTE.** D-008 intacto. **Date:** 2026-04-18
- **Re-spike Raúl con plugins reales:** ACF (1.5M sites), Yoast SEO (5M sites), WooCommerce display básico, Contact Form 7. Hard stop jueves 2026-04-25. Los 3 pilotos anteriores (Footnotes/Shortcodes Ultimate/Display Posts) eran juguetes. **Date:** 2026-04-18
- **ADRs Helena innegociables:** bridge security boundary (jueves 23-04) + observability (Sprint 3 kickoff). Gates pre-prod. **Date:** 2026-04-18
- **HTTP async wrapper Worker Threads** fuera de Fase A — requiere spike dedicado. Entra Fase B o nunca. **Date:** 2026-04-18
- **Outreach viernes 24-04:** pregunta binaria con fricción económica: "¿pagarías X€ por piloto Q3 si plugins contenido funcionaran?" Binaria sí/no. **Date:** 2026-04-18
- **Criterios activación/archivado explícitos en ADR roadmap ANTES de código Fase A:** ≥5 sí → Fase B. <3 sí → archivar Fase A sin sunk-cost rework. **Date:** 2026-04-18
- **Co-firmas ADR roadmap:** Alejandro + PO + Román + Eduardo. El PO queda en el documento para evitar re-archivados silenciosos. **Date:** 2026-04-18
- **ClassicPress y PressNext fracasaron** por coste mantenimiento (no premisa). Lección: versión WP target única (6.4 LTS) y congelar. **Date:** 2026-04-18
- **Respeto al cierre ciclo anterior:** nadie arranca scope esta noche. Lunes 21 re-spike. **Date:** 2026-04-18

## REVOCACIÓN — Meet sesión 2 "Reabrir mapa PHP-WASM" (2026-04-18)

> **ESTA DECISIÓN FUE REVOCADA por clarificación del PO el mismo 2026-04-18.**
> El PO clarificó que "no vale" significaba **descartar el mapa entero**, no reabrir con plan por fases.
> Ver `docs/process/comunicados/2026-04-18-reversion-mapa-php-wasm.md`.

- **Plan por fases A/B/C (Phased WP Bridge Roadmap): RECHAZADO** — no se escribe ADR, no se implementa. **Date:** 2026-04-18
- **Re-spike con 4 plugins reales (ACF, Yoast, WooCommerce, Contact Form 7): CANCELADO.** Vuelve al spike original validated GO. **Date:** 2026-04-18
- **Tier 2.5 "bridges de contenido real": DESCARTADO.** Tier 2 sigue siendo content-only según ADR-003 + ADR-008. **Date:** 2026-04-18
- **Outreach 24-04:** pregunta NEUTRAL sobre dolor/stack, NO sobre plugins compat. **Date:** 2026-04-18
- **D-008 intacto:** CMS nativo Node, NO orquestador WP. **Date:** 2026-04-18
- **ADRs Helena (security + observability) MANTIENEN:** saludables con independencia del scope. **Date:** 2026-04-18
- **Lección:** "no vale" del PO puede significar "no vale esta solución" O "no vale el tema". Próxima vez, preguntar binaria antes de re-abrir. **Date:** 2026-04-18

## Meet 2026-04-18 — Kickoff Sprint 2

- **drizzle:generate + migrate con journal = prioridad Sprint 2 día 1.** Brief Carmen, medio día de trabajo. Sin journal no se aprueba despliegue DB. **Date:** 2026-04-18
- **ADR-017 es gate para código Tier 2:** sin ADR firmado no arranca implementación bridge. Esperamos a lunes 21-04. **Date:** 2026-04-18
- **Bug excerpt.raw en serialize.ts:** ticket S2-W1, Carmen cierra. Ingrid anota ticket. **Date:** 2026-04-18
- **ADR-013 → Accepted hoy EOD.** GC CircuitBreaker entra como ticket Sprint 2 semana 1. **Date:** 2026-04-18

## Sprint 2 — Entregables ejecutados (2026-04-18)

- **drizzle:generate+migrate con journal:** journal comiteado en packages/db/drizzle/. drizzle:push eliminado de flujo producción. **Date:** 2026-04-18
- **Bridge core (packages/server/src/bridge/index.ts):** renderShortcodes, destroyBridge, registerBridgeHooks. Lazy singleton PHP-WASM. 8 unit tests + 8 integration tests. **Date:** 2026-04-18
- **ADR-019 Bridge observability → Accepted (co-sign con Helena):** BridgeSpan emitido en todas las rutas (happy + error). **Date:** 2026-04-18
- **Bridge wiring en server boot:** NODEPRESS_TIER2=true activa bridge + 3 pilots. toWpPostAsync en listPosts/getPost. **Date:** 2026-04-18
- **toWpPostAsync:** async serializer con bridge pre-process + sync the_content filter. Backward compat preservado. **Date:** 2026-04-18
- **ADR-009 context=edit:** SerializeContext param en toWpPost/toWpPostAsync. raw fields en context=edit. 5 nuevos tests serialize. **Date:** 2026-04-18
- **Estado Sprint 2:** 16/16 done. 231 tests verdes. 16 ADRs Accepted. **Date:** 2026-04-18

## Sprint 3 — Taxonomías CRUD read-only + OpenAPI spec (2026-04-18)

- **Spec OpenAPI completa:** `WpTerm` schema añadido a `docs/api/openapi.yaml`. 4 endpoints: `GET /wp/v2/categories`, `GET /wp/v2/categories/{id}`, `GET /wp/v2/tags`, `GET /wp/v2/tags/{id}`. Tag `Taxonomies` creado. **Date:** 2026-04-18
- **Plugin Fastify:** `packages/server/src/routes/taxonomies/index.ts` — `listTerms(taxonomy, opts)` + `getTermById(taxonomy, id)` + `toWpTerm(row, taxonomy)`. Registrado en `server/src/index.ts`. **Date:** 2026-04-18
- **Diseño count:** calculado como subquery correlacionada sobre `term_relationships`. No existe columna `count` en la tabla `terms`. **Date:** 2026-04-18
- **Sprint 3 constraints aplicados:** `parent` siempre 0 (sin jerarquía). Solo `GET` (no POST/PUT/DELETE). **Date:** 2026-04-18
- **Tests:** 9 tests en `taxonomies.test.ts`. Todos verdes. Suite global: 263 tests, 0 fallos. **Date:** 2026-04-18
- **Mock pattern para drizzle fluent builder:** `makeQueryMock()` retorna un objeto donde `.select().from().where()` retorna un Promise que también tiene `.orderBy()` → cubre tanto listTerms (que usa `.orderBy()`) como getTermById (que desestructura el array del Promise). **Date:** 2026-04-18
- **DIV-004 cerrado en sprint 3:** taxonomías ahora tienen endpoints. La nota en `x-nodepress-notes` sigue vigente indicando que `categories`/`tags` en el shape `Post` aún están ausentes (pendiente sprint 4 si se decide). **Date:** 2026-04-18

## Sprint 3 día 1 — #44 Auth reads user from DB + GET /wp/v2/users/me (2026-04-18)

- **requireAdmin now queries DB:** `packages/server/src/auth/bearer.ts` — calls `db.select().from(users).where(eq(users.login, login)).limit(1)`. Returns 401 if user not found, 403 if roles array doesn't include 'administrator'. `NODEPRESS_ADMIN_USER` env var controls which login to resolve (default: "admin"). **Date:** 2026-04-18
- **requireAuth added:** Same as requireAdmin but no role check — any authenticated user. Used for /wp/v2/users/me. **Date:** 2026-04-18
- **AuthenticatedUser type updated:** Now carries `{id, login, email, displayName, roles, capabilities}` from DB row. Old `{role: "admin"}` shape replaced. All callers use `request.user?.id` (optional chaining, backward compat). **Date:** 2026-04-18
- **GET /wp/v2/users/me:** `packages/server/src/routes/users/index.ts` — WP-compatible shape: `{id, name, slug, email, url, description, link, locale, nickname, registered_date, roles, capabilities, _nodepress: {login}}`. Registered in server/index.ts. **Date:** 2026-04-18
- **Test strategy for DB-dependent preHandlers:** vi.mock("@nodepress/db") with mutable `mockUserRows` slot — tests swap the resolved user to test 403 path. requireAdmin/requireAuth no longer accept injected db param (Fastify preHandler signature incompatibility). **Date:** 2026-04-18
- **Demo test mock patched:** Added `users` table export and chainable `where()` mock `{limit: () => Promise([adminRow]), then: (...) => Promise([]).then(...)}` to support both requireAdmin's `.limit()` call and handlers' direct `await where()`. **Date:** 2026-04-18
- **254 tests green (up from 246):** 8 new tests — 4 bearer auth (including 403 path), 3 GET /wp/v2/users/me (401 no token, 401 bad token, 200 with WP shape). **Date:** 2026-04-18

## Meet 2026-04-18 — Planning Sprint 3 (roles, taxonomías, admin edit, CLI init)

- **#44 P0 día 1: auth roles DB.** `requireAdmin` debe consultar `roles` en DB, no solo validar Bearer. Schema ya tiene `roles text[]` + `capabilities jsonb`. **Date:** 2026-04-18
- **`GET /wp/v2/users/me` encadenado en #44:** no es ticket separado. Ingrid lo hace en el mismo PR aprovechando user del token. **Date:** 2026-04-18
- **Spec OpenAPI taxonomías bloquea implementación Carmen:** Ingrid entrega spec días 1-2 Sprint 3. Endpoints: `GET /wp/v2/categories`, `GET /wp/v2/tags`, `GET /wp/v2/taxonomies`. **Date:** 2026-04-18
- **Taxonomías mínimas sin jerarquía:** categorías y tags planas en Sprint 3. Jerarquía = deuda documentada en ADR. **Date:** 2026-04-18
- **Timeout `renderShortcodes` bridge:** sin timeout = riesgo de producción (request cuelga si php-wasm se congela). Raúl añade AbortSignal 5s. **Date:** 2026-04-18
- **`context=edit` circular dependency resuelta:** requireAdmin real (roles DB) necesario para que context=edit sea seguro. Sprint 3 #44 cierra el círculo. **Date:** 2026-04-18

## Kickoff Sprint 4 — 2026-05-19

- **Sprint 4 arranca 2026-05-19:** Goal = NodePress extensible con vm.Context sandbox, ThemeEngine MVP y gestión post-lanzamiento. **Date:** 2026-05-19
- **Ingrid en P2:** GET /wp/v2/users readonly (#64) con Carmen. Unblocked tras cierre P1. **Date:** 2026-05-19
- **Issues externos triage <48h:** proceso activo desde 19-05. CLA obligatorio en primer PR externo. **Date:** 2026-05-19

## Meet 2026-04-19 — PoC PHP plugins en rama

- **`vfsMounts` en BridgePilot:** Campo opcional `vfsMounts?: { virtualPath: string; hostPath: string }[]`. Amendment ADR-017 obligatorio. Pilotos TS existentes no lo necesitan. **Date:** 2026-04-19
- **Install-service PHP:** NO entra en la PoC. Gap conocido: `get(slug)` devuelve `null` para plugins PHP llegados como directorio. Flujo necesario para sprint formal: `parsePhpHeaders → register(pending) → resolveDependencies → activate`. **Date:** 2026-04-19
- **Plugin registry en PoC:** solo `ACTIVE_PILOTS` compile-time. El install-service con soporte PHP es sprint formal con ADR propio. **Date:** 2026-04-19
- **Scope PoC:** Footnotes solamente (119 LOC, sin deps externas). Display Posts condicional si Footnotes valida el patrón. **Date:** 2026-04-19
