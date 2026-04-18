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
