---
name: dev-backend-carmen-nodepress
description: Project memory for Carmen (Dev Backend) in NodePress
type: project
---

## Sprint 1 día 1 — #15 + #16 Posts REST endpoints (2026-04-17)

- **5 endpoints WP-compat v2 en `packages/server/src/routes/posts/`:** index.ts (plugin), handlers.ts (lógica), serialize.ts (`toWpPost`), schemas.ts (Fastify JSON schemas), __tests__/posts.integration.test.ts (14/14 green). **Date:** 2026-04-17
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
