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
