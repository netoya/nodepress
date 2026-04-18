---
name: dev-backend-carmen-nodepress
description: Project memory for Carmen (Dev Backend) in NodePress
type: project
---

## Sprint 1 día 1 — #15 + #16 Posts REST endpoints (2026-04-17)

- **5 endpoints WP-compat v2 en `packages/server/src/routes/posts/`:** index.ts (plugin), handlers.ts (lógica), serialize.ts (`toWpPost`), schemas.ts (Fastify JSON schemas), **tests**/posts.integration.test.ts (14/14 green). **Date:** 2026-04-17
- **`toWpPost()` mapea Drizzle → WP shape con divergencias OpenAPI aplicadas:** DIV-001 omite `_gmt` variants, DIV-002 envuelve title/content/excerpt en `{rendered, raw, protected:false}`, DIV-005 expone `type`/`parent_id`/`menu_order`/`meta` bajo `_nodepress`. **Date:** 2026-04-17
- **`requireAdmin` de Ingrid integrado como preHandler:** POST/PUT/DELETE requieren auth. GET public. **Date:** 2026-04-17
- **Dependencies añadidas a `packages/server/package.json`:** `@nodepress/db` (workspace), `drizzle-orm`, `fastify-plugin`. **Date:** 2026-04-17
- **Tests 14/14 con `.inject()` + DATABASE_URL dummy** (sin DB real). Verifican routing + auth enforcement + status codes + headers paginación. **Why:** sin setup de test DB establecido en repo. **Flag para Ingrid #17:** full integration con DB real requiere test database setup — deuda no bloqueante hoy. **Date:** 2026-04-17
- **DELETE soft vs hard:** default soft (status=trash); `?force=true` hard delete. Devuelve Post pre-delete (shape con `deleted: true`). **Date:** 2026-04-17
- **Pagination headers `X-WP-Total` + `X-WP-TotalPages`:** devueltos en list endpoint. Per_page max 100, default 10. **Date:** 2026-04-17
- **Schema Drizzle tiene todos los campos necesarios — sin bloqueadores.** **Date:** 2026-04-17

## Sprint 1 día 2 — #20 fix raw field alignment con OpenAPI (2026-04-18)

- **Ingrid detectó desalineamiento en #17 test harness:** `toWpPost()` devolvía `{rendered, raw, protected}` pero OpenAPI schema RenderedField solo declara `{rendered, protected}`. Bug: `raw` expone contenido sin renderizar a clientes públicos. **Date:** 2026-04-18
- **Fix aplicado (Opción A):** Eliminar campo `raw` de serialize.ts en todos los contextos. NodePress v1 opera en `context=view` exclusivamente. Full `?context=edit` support se pospone a Sprint 2 cuando roles estén implementados. **Date:** 2026-04-18
- **ADR-009 creado:** Documenta decisión de diferir context param a Sprint 2. Rationale: Sprint 1 no tiene consumidor edit-context; implementación completa agrega ~50 líneas + complexity en routing. Rollback trivial si business demand surge. **Date:** 2026-04-18
- **Tests:** 43/43 verde (14 Carmen posts integration + 26 Ingrid conformance + 3 bearer auth). Fixtures Ingrid ya omitían `raw`; fix es 100% compatible. **Date:** 2026-04-18
- **Ficheros:** serialize.ts (cambio principal), post.contract.test.ts (TS strict type fix pre-existente), vitest.workspace.ts (fix config admin ref), ADR-009 creado. **Date:** 2026-04-18

## Sprint 1 día 2 — #21 slug auto-sufijo WP-style (2026-04-18)

- **Problema:** POST `/wp/v2/posts` devolvía 400 cuando slug derivado ya existía (ej: `[demo]-hello-from-demo`). WP devuelve 201 + auto-sufija a `-2`, `-3`, etc. Bloqueaba demo (no podía re-crear post con mismo título). **Date:** 2026-04-18
- **Solución:** Nuevo fichero `packages/server/src/routes/posts/slug.ts` con funciones puras: `deriveSlug(title)` → kebab-case, `findAvailableSlug(baseSlug, exists)` → auto-sufija hasta `-100`. inyectable `exists` callback para testability. **Date:** 2026-04-18
- **Integración POST handler:** Si `slug` explícito → sin auto-sufijo (409 si colisión). Si auto-derivado → auto-sufija. Límite defensivo: 100 intentos → 500 + error "too many duplicates". **Date:** 2026-04-18
- **Integración PUT handler:** Si título actualizado sin slug explícito → re-deriva + auto-sufija. Si slug explícito → uso directo (409 si colisión). Si ninguno de ambos → slug sin cambios. **Date:** 2026-04-18
- **Tests:** Nuevos `slug.test.ts` 13 tests (unit de derivación + colisiones). Integración: 2 tests en `posts.integration.test.ts` verifican flujo auth. Demo e2e: mock DB mejorado para soportar slug queries sin colisiones falsas. **Date:** 2026-04-18
- **OpenAPI doc:** PostCreateBody y PUT actualizados con descripción detallada de slug handling. Respuesta 409 agregada a POST y PUT. **Date:** 2026-04-18
- **Mock DB fix:** `demo-end-to-end.test.ts` vi.mock de `@nodepress/db` extendido: WHERE queries ahora retornan `[]` (sin colisiones) para evitar bucle infinito en `findAvailableSlug`. **Date:** 2026-04-18
- **Tests:** 142/142 verde (139 passed + 1 skipped + 2 todo). Sin regressions en 14 posts integration + 26 WP conformance + 7 demo + 13 slug unit. **Date:** 2026-04-18
- **Ficheros creados:** `slug.ts`, `slug.test.ts`. **Ficheros modificados:** `handlers.ts`, `posts.integration.test.ts`, `demo-end-to-end.test.ts`, `openapi.yaml`. **Date:** 2026-04-18

## Sprint 1 día 2 — #22 public HTML renderer MVP (2026-04-18)

- **Tarea:** Implementar frontend público CMS (no admin editor) — mostrar al CTO "crea aquí, se publica allá". **Date:** 2026-04-18
- **GET / handler:** Home con lista de posts published (max 10, DESC por createdAt). Cada post: `<article>` con título (link a `/p/:slug`) + excerpt/primeros 200 chars del content. Header con "NodePress" H1 + tagline. Footer con link REST API + "Powered by NodePress". **Date:** 2026-04-18
- **GET /p/:slug handler:** Página individual del post. 404 si slug no existe o status != publish (no draft leak). Aplica filter `the_content` en el content renderizado — **mismo patrón que REST serialize.ts**, demostrando hook wiring. **Date:** 2026-04-18
- **HTML inline + CSS mínimo:** Sin template engine externo. CSS inline en `<style>` tag (120+ líneas). Blog-ish: max-width 720px centrado, font system stack, espaciado claro, accent colors para links. Minimalista pero decente. **Date:** 2026-04-18
- **HTML escaping:** Función `escapeHtml()` para title + slug (previene XSS). Content no escapado (viene del hook ya como HTML, patrón WP). **Date:** 2026-04-18
- **Plugin estructura:** Nuevo `packages/server/src/routes/public/` con index.ts (plugin), handlers.ts (lógica), `__tests__/public.integration.test.ts` (6 tests). Registrado en `packages/server/src/index.ts` DESPUÉS de postsPlugin. Reemplaza ruta "/" simple anterior. **Date:** 2026-04-18
- **Tests 6/6 verde:** (1) GET / → 200 + "NodePress" + `<article>`. (2) GET / → lista posts published only (no drafts). (3) GET /p/:slug → 200 + content + hook applied. (4) GET /p/:slug + custom filter → hook mutation visible. (5) GET /p/nonexistent → 404 HTML. (6) GET /p/draft-post → 404 (no leak). **Date:** 2026-04-18
- **Mock DB:** In-memory store con 2 posts fixture (publish + draft). Mock returns array para todos WHERE queries, handlers filtran manualmente por status/slug. **Date:** 2026-04-18
- **Tests:** 145/148 verde (new 6 public + existing 139 posts/hooks/conformance + 1 skipped + 2 todo). Sin regressions. **Date:** 2026-04-18
- **Ficheros creados:** `packages/server/src/routes/public/index.ts`, `packages/server/src/routes/public/handlers.ts`, `packages/server/src/routes/public/__tests__/public.integration.test.ts`. **Ficheros modificados:** `packages/server/src/index.ts` (import + register publicPlugin). **Date:** 2026-04-18

## Sprint 1 día 2 — #23 Tier 2 bridge integration into content pipeline (2026-04-18)

- **Tarea:** Conectar `renderShortcodes` del bridge Tier 2 en el pipeline de contenido real (REST GET + página pública).
- **Problema:** `applyFilters("the_content", ...)` corre con filtros sync registrados, pero el bridge (async PHP-WASM) nunca se llamaba desde los handlers GET.
- **Solución implementada:**
  1. Nueva función `toWpPostAsync()` en `serialize.ts`: versión async de `toWpPost()` que opcionalmente llama `renderShortcodes` si `bridge` está provisto. Si bridge devuelve `error !== null`, usa original content (passthrough). Luego aplica `the_content` filter sync.
  2. Actualizar `listPosts()` en `handlers.ts`: si `NODEPRESS_TIER2==="true"`, usa `toWpPostAsync` con bridge inyectado. Si no, comportamiento sync idéntico.
  3. Actualizar `getPost()` en `handlers.ts`: mismo patrón.
  4. Actualizar `GET /p/:slug` handler en `public/handlers.ts`: pre-procesa con `renderShortcodes` antes de `applyFilters("the_content", ...)`. Fail-safe: cualquier error → original content.
  5. Tests: nuevo archivo `serialize.test.ts` con 8 tests que cubren: serialization sync, filter application, async sin bridge (backward compat), async con bridge mockeado, bridge error passthrough, bridge exception handling, \_nodepress fields.
- **Archivos modificados:** `packages/server/src/routes/posts/serialize.ts` (+96 líneas async fn), `packages/server/src/routes/posts/handlers.ts` (import bridge, actualizar listPosts + getPost), `packages/server/src/routes/public/handlers.ts` (import bridge, actualizar getPost). **Archivo creado:** `packages/server/src/routes/posts/__tests__/serialize.test.ts` (8 tests).
- **Tests:** 150+ passando (new 8 serialize + existing posts/public/conformance). Sin regressions.
- **ADR compliance:** ADR-017 §Hook Integration pattern implemented: bridge async work hoisted before `applyFilters`, filter entry remains sync no-op anchor. ADR-005 (sync filters) intact.
- **Flags:** NODEPRESS_TIER2 activa bridge en GET endpoints. Backward compat cuando env var ausente.
- **Date:** 2026-04-18

## Sprint 1 día 2 — #18 drizzle migrations with journal (2026-04-18)

- **Migration:** De `drizzle:push` (sin historial) a `drizzle:generate` + `drizzle:migrate` con journal comiteado. **Date:** 2026-04-18
- **drizzle:generate ejecutado:** Generó migración inicial `packages/db/drizzle/0000_productive_grandmaster.sql` con todos 7 tablas (posts, users, options, term_relationships, terms, comments, plugin_registry). 101 líneas SQL con FKs e índices. **Date:** 2026-04-18
- **Journal comiteado:** `packages/db/drizzle/meta/_journal.json` y `meta/0000_snapshot.json` ahora en repo. Habilita recovery de schema y auditability en producción. **Date:** 2026-04-18
- **Scripts:** `package.json` verificado (scripts `migrate` + `drizzle:generate` + `drizzle:push` ya existían). Removido `drizzle:status` (comando inexistente en drizzle-kit v0.30.0). **Date:** 2026-04-18
- **README creado:** `packages/db/README.md` con estrategia dev vs prod: dev → `drizzle:push` (sin journal), prod → `drizzle:generate` → commit → `drizzle:migrate`. **Date:** 2026-04-18
- **Commits:** `ec5d2ca` — feat(#18): implement drizzle migrations with journal tracking. **Date:** 2026-04-18

## Sprint 2 — Entregables ejecutados (2026-04-18)

- **#28 drizzle:generate+migrate con journal:** 0000_productive_grandmaster.sql + \_journal.json + snapshot. packages/db/README.md. **Date:** 2026-04-18
- **#30 Bug excerpt.raw OpenAPI fix:** serialize.ts raw field removido de context=view (solo visible en context=edit). **Date:** 2026-04-18
- **Pilot Display Posts (packages/server/src/bridge/pilots/display-posts.ts):** buildDisplayPostsPhpCode, candidatePosts[] PHP literal array, /p/:slug URLs. 17 tests. **Date:** 2026-04-18
- **ADR-009 ?context=edit HTTP integration tests:** context-edit.test.ts — 7 tests HTTP layer (Fastify inject). Auth enforcement GET /wp/v2/posts + GET /wp/v2/posts/{id}. **Date:** 2026-04-18
- **Estado Sprint 2:** 16/16 done. 231 tests verdes. **Date:** 2026-04-18

## Sprint 3 — Tarea #51: POST/PUT posts acepta categories y tags en term_relationships (2026-04-18)

- **Funcionalidad:** Endpoints POST/PUT /wp/v2/posts ahora aceptan arrays `categories: number[]` y `tags: number[]` en el payload. Persistencia en tabla `term_relationships` con soporte para FK cascading.
- **Implementación:**
  1. **Handler POST createPost:** Extrae `categories` y `tags` del body (default `[]`). Deduplicación de IDs con `new Set()`. Inserta en `term_relationships` para cada termId con `postId` + `order=0`. Silenciosamente ignora FK constraint violations (términos no existentes).
  2. **Handler PUT updatePost:** Extrae `categories` y `tags` si presentes. DELETE existentes, INSERT nuevos (idempotente — reemplaza, no acumula). Mismo patrón de inserción que POST.
  3. **Serializer toWpPost:** Añade parámetros opcionales `categories: number[] = []` y `tags: number[] = []`. Retorna ambos arrays en shape WP. Backward compat: defaults [] si no provisto.
  4. **Serializer toWpPostAsync:** Añade helper `loadPostTerms(postId)` que consulta `term_relationships` + `terms` con innerJoin, filtra por taxonomy ("category"/"post_tag"), devuelve tupla `[categoryIds, tagIds]`. toWpPostAsync carga términos y retorna en shape.
  5. **Handlers GET getPost:** Llama `loadPostTerms()` antes de serializar, pasa arrays a toWpPost.
  6. **Handlers GET listPosts:** No carga términos (lista es cara). toWpPostAsync ya los carga internamente.
  7. **Tests:** 4 nuevos tests en posts.real-db.test.ts: (1) POST con categories persiste relaciones, (2) PUT reemplaza categorías (no acumula), (3) GET devuelve arrays vacíos sin relaciones, (4) POST con categorías + tags separa ambas taxonomías.
- **Notas:**
  - Schema: table `term_relationships(postId FK → posts.id CASCADE, termId FK → terms.id CASCADE, order INT DEFAULT 0, PK=(postId,termId))`
  - Idempotencia: PUT siempre reemplaza, nunca acumula. Útil para flujos de edición sin estado.
  - Silently ignore non-existent terms: Si admin envía `categories: [999]` (no existe), ignora. No falla request. WP-style behavior.
  - Mock DB actualizado para soportar `select().from().innerJoin().where()` en tests (demo-end-to-end.test.ts).
- **Ficheros modificados:** handlers.ts (POST/PUT + loadPostTerms import), serialize.ts (+loadPostTerms helper, +categories/tags params), posts.real-db.test.ts (+4 tests).
- **Ficheros nuevos:** serialize.test.ts refactored con DB mocks para cargas de términos.
- **Tests:** 266/266 verdes (nuevo serialize.test.ts + 4 posts.real-db.test.ts + existentes). Sin regressions.
- **Date:** 2026-04-18

## Sprint 4 — #64: GET /wp/v2/users + #62: Plugin API docs (2026-04-18)

### #64 GET /wp/v2/users (readonly endpoint)

- **Funcionalidad:** Nuevo endpoint público GET /wp/v2/users que lista usuarios sin exponiendo sensibles. Paginación básica con `?page=1&per_page=10` (max 100 per_page, default 10).
- **Implementación:**
  1. **Estructura:** Fichero `packages/server/src/routes/users/index.ts` ya existía (solo `/me`). Añadido nuevo endpoint `/wp/v2/users` antes de `/me` en el mismo plugin.
  2. **Serializers:** Dos funciones:
     - `toWpUserPublic()`: Serializa fila DB a shape WP public (sin email, con avatar_urls vacíos, \_links). Solo id/name/slug/url/description/link/avatar_urls/\_links.
     - `toWpUser()`: Serializa AuthenticatedUser o fila DB a shape full (con email). Overload para ambos tipos. Detecta `createdAt` con `in` check para backward compat.
  3. **Handler listUsersHandler:** Parse page/per_page de query (casteo `request.query as Record<string, unknown>`), fetch todos usuarios sin WHERE, aplica slice en memory (PoC), retorna array WP-shaped. Headers `X-WP-Total`, `X-WP-TotalPages` (WP standard).
  4. **Auth:** Endpoint público, sin preHandler.
  5. **TS strict compliance:** Todos los tipos narrowed correctamente. Capabilities casteo a `Record<string, unknown>` con null-guard. Query params casteo a Record.
- **Tests:** 4 nuevos en `users.test.ts` (del describe "GET /wp/v2/users"):
  - GET /wp/v2/users → 200, array, 3 users (no email exposed)
  - Headers X-WP-Total + X-WP-TotalPages
  - Paginación page=1&per_page=2 → 2 users, page=2&per_page=2 → 1 user
  - Email field undefined en public response
  - Plus: test existente de GET /wp/v2/users/me refactorizado (compartir fixtures).
  - **Mock DB actualizado:** `.select().from()` sin `.where()` es thenable, devuelve mockAllUserRows promise. Con `.where()` devuelve [mockAllUserRows[0]].
- **Ficheros modificados:** `users/index.ts` (+84 líneas, +2 interfaces, +2 serializers, +1 handler), `users/__tests__/users.test.ts` (+4 test cases, mock refactored).
- **Tests:** 7/7 verde (4 nuevos + 2 existentes /me + 1 sin auth). 291 tests suite total (sin regressions).
- **Date:** 2026-04-18

### #62 Plugin API docs

- **Fichero creado:** `docs/guides/plugin-api.md` (60 líneas).
- **Contenido:**
  - Breve intro: plugins son módulos JS/TS que registran hooks en HookRegistry.
  - Contrato de activación: default export function(hooks: HookRegistry, context: PluginContext): void | Promise<void>
  - Tabla de Available Hooks: 3 filters (the_content, the_title, the_excerpt), 2 actions (pre_save_post, save_post).
  - Configuration: env var NODEPRESS_PLUGINS_DIR (default ./plugins).
  - Example Plugin: referencia a packages/plugins/hello-world/index.js.
  - Sandbox: 5-second timeout guard (ADR-020).
  - References: ADR-012, ADR-020.
- **Date:** 2026-04-18

## Sprint 4 — #63: WP Import CLI stub (2026-04-18)

- **Tarea:** Añadir comando CLI `nodepress import-wp <source>` como stub — no implementa import real (Sprint 5+), pero es ejecutable con ayuda clara.
- **Implementación:**
  1. **Nueva función `importWpCommand(argv: string[])`:** Parsea `<source>` (required), `--format` (default "wxr"), `--dry-run` (flag). Valida source (error + exit 1 si falta).
  2. **Help system `showImportWpHelp()`:** Help text detallado con examples. Invocable con `--help` o `-h`.
  3. **Output del stub:**
     - `[import-wp] Source: <source>, format: <format>, dry-run: <bool>` (info input)
     - `[import-wp] WP Import not yet implemented. Coming in Sprint 5.` (aviso)
     - Exit code 0 (no falla — es stub)
  4. **Integración en `main()`:** Rama `else if (command === "import-wp")` llama `importWpCommand(args.slice(1))`.
  5. **Help global actualizado:** Main help text añade `import-wp` en la lista de comandos.
- **Tests:** 2 nuevos en `cli.test.ts`:
  - `nodepress import-wp ./export.xml` → muestra source + format + dry-run + "not yet implemented"
  - `nodepress import-wp --help` → muestra help text (WordPress content importer, --format, --dry-run, ejemplos)
- **All 6/6 tests verde** (2 nuevos + 4 existentes).
- **Format:** `npx prettier` + `npx eslint --fix` aplicado. Type-check TS strict sin errores.
- **Ficheros modificados:** `packages/cli/src/index.ts` (+73 líneas: importWpCommand, showImportWpHelp, main branch), `packages/cli/src/__tests__/cli.test.ts` (+21 líneas: 2 nuevos tests).
- **Date:** 2026-04-18
