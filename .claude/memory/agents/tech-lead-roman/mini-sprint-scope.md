# Mini-Sprint Intermedio — Pages, Users, Settings

> **Autor:** Román (Tech Lead)
> **Fecha:** 2026-04-19
> **Ventana sugerida:** 1 semana (5 días hábiles) entre Sprint 7 y Sprint 8
> **Sprint Goal:** "NodePress gestiona el contenido no-blog (Pages), administra usuarios completos (CRUD + roles) y expone configuración del sitio (Settings). Paridad con WP REST v2 en las 3 áreas."

---

## Contexto del estado actual (snapshot 2026-04-19)

### Lo que YA existe (reutilizable)

**DB schema (`packages/db/src/schema/`):**
- `posts.type` ya es `varchar(20)` con default `"post"` — **soporta `"page"` sin migración**. El index `posts_type_status_idx` ya cubre la query pattern.
- `posts.parentId` ya existe (necesario para page hierarchy, aunque Sprint 3 decidió taxonomías sin jerarquía — pages SÍ necesitan `parent` WP-compat).
- `users` tiene `roles text[]` + `capabilities jsonb` + `passwordHash` + `meta jsonb`. **Schema completo, no requiere ALTER.**
- `options` existe (`name varchar(191) unique`, `value jsonb`, `autoload boolean`) — no hay endpoints REST que la toquen todavía.

**REST endpoints (`packages/server/src/routes/`):**
- `posts/` — CRUD completo con hooks `pre_save_post` + `the_content`, slug auto-suffix (ADR-007), `context=view|edit` (ADR-009), pagination headers `X-WP-Total` / `X-WP-TotalPages`.
- `users/` — **solo GET list (público, sin email) + GET /users/me**. Falta POST/PUT/DELETE + GET /users/:id.
- `media/`, `taxonomies/` — fuera de scope de este mini-sprint.

**Admin panel (`admin/src/features/`):**
- `posts/` — PostsListPage + PostEditorPage + PostEditorRoute ya operativos.
- `users/` — UsersPage con list + RoleEditorModal (sólo cambia rol). Falta create/edit/delete usuario completo.
- Router: `createHashRouter` con rutas `/posts`, `/posts/new`, `/posts/:id/edit`, `/users`, `/plugins`. Sidebar estático en `AdminLayout.tsx`.

### Lo que FALTA

1. Pages como `post_type="page"` — REST WP-compat + sidebar entry + editor con `parent` y `menu_order`.
2. Users CRUD completo — create (con password hash), edit (sin rotar password salvo explicit), delete (con reassign author), el UI de edición más allá de role.
3. Settings — **tabla `options` existe pero sin servicio, sin REST, sin admin UI**. Este es el área con mayor delta.

---

## Arquitectura (3 decisiones load-bearing)

### 1. Pages reutiliza `posts` table — NO nueva tabla

**Decisión:** `post_type="page"` via columna `type` existente. Pages comparten `slug unique`, `meta`, `status`, `author`, `parentId` con posts.

**Trade-off:**
- Ganamos: 0 migraciones de schema, serializer reutilizable (`toWpPost` / `toWpPostAsync`), slug auto-suffix ya implementado, hooks `pre_save_post` / `the_content` aplican transparentemente.
- Perdemos: endpoints `/wp/v2/pages` comparten handler con `/wp/v2/posts` — riesgo de acoplamiento si un día pages diverge mucho (p.ej. custom fields específicos). Mitigación: handler parametrizado por `postType` string, no duplicar código.

**Implicación WP-compat:** WP expone `/wp/v2/pages` como endpoint distinto de `/wp/v2/posts`, aunque internamente son la misma tabla `wp_posts` con `post_type` diferente. Replicamos ese patrón exacto.

### 2. Users CRUD — password hashing con `bcrypt`, nunca en REST response

**Decisión:** endpoint POST /wp/v2/users crea user con `password` en body (requerido), lo hashea con `bcrypt(12)` antes del insert. PUT /wp/v2/users/:id solo rota password si el body incluye `password` explícito — omisión = no tocar hash.

**Trade-off:**
- Ganamos: WP-compat (WP usa `phpass` pero el contrato REST es idéntico — body acepta `password` plain), password nunca se loggea ni se devuelve en ningún shape.
- Perdemos: `bcrypt` añade dep en `packages/server`. Alternativa nativa `crypto.scrypt` descartada por ergonomía — bcrypt es estándar de facto en el ecosistema Node. ADR menor requerido (dependency evaluation).

**Security (consultar Helena antes de merge):** password mínimo 8 chars, validación en schema JSON. Rate limit en POST/PUT /users propuesto para Sprint 8 (fuera de scope).

### 3. Settings — servicio key→value sobre `options` table, NO columnas dedicadas

**Decisión:** endpoint GET/PUT /wp/v2/settings devuelve/acepta un **objeto flat** con keys whitelisted (`siteTitle`, `siteDescription`, `siteUrl`, `adminEmail`, `postsPerPage`, `defaultCategory`). Internamente cada key es una fila en `options` (`name=siteTitle`, `value="..."` en JSONB).

**Trade-off:**
- Ganamos: extensible (un plugin puede añadir option key sin migración), schema ya existe, `autoload=true` para boot-time settings (patrón WP clásico), GET puede leer todos los autoload en una query.
- Perdemos: no hay constraint DB de tipos por key — validación en la capa servicio/schema JSON. Aceptable para Sprint MVP. Whitelist hardcoded de 6 keys Sprint MVP; extensible a "free-form" en Sprint N+1 vía capability gate.

**WP-compat:** WP REST expone `/wp/v2/settings` con exactamente este shape (objeto plano). Mapping de nombres: WP usa `title`/`description`/`url`/`email`/`posts_per_page`/`default_category` — replicamos exactos para compat clients.

---

## Tickets (11 en total, 7 días de capacity con paralelización)

**Leyenda responsable:** Ingrid (lead backend), Carmen (dev backend), Lucas (lead frontend), Marta (dev frontend), Raúl (dev backend — infra/security/ADR).

| #   | Título                                                                     | Descripción (1 línea)                                                                                                                     | Responsable      | Prioridad | Dependencias                 |
| --- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------- | ---------------------------- |
| M1  | ADR-025: Content polymorphism (pages over posts table)                     | Formaliza reutilización de `posts.type` para pages, handler parametrizado por `postType`, implicación hook scope (pre_save_post aplica)   | Román            | P0        | —                            |
| M2  | Pages REST endpoints: GET/POST /wp/v2/pages + GET/PUT/DELETE /wp/v2/pages/:id | Handler parametrizado `postType="page"`, reutiliza `toWpPost`, soporta `parent` y `menu_order` en schema, paginación WP headers            | Carmen           | P0        | M1                           |
| M3  | Schema JSON + OpenAPI para pages + tests WP-conformance                    | `PageSchema`, `PageCreateBodySchema`, `PageUpdateBodySchema`; tests ejercitan `parent`, `menu_order`, slug collision, context=edit         | Ingrid           | P0        | M2                           |
| M4  | Users CRUD backend: POST/PUT/DELETE /wp/v2/users + GET /wp/v2/users/:id   | `bcrypt` hashing, password nunca en response, DELETE con `?reassign=<id>` WP-style, admin-only salvo /me                                  | Ingrid + Carmen  | P0        | —                            |
| M5  | ADR-026: Password hashing strategy (bcrypt)                                | Dep bcrypt aceptada, cost factor 12, rationale vs argon2/scrypt, rotación password en PUT                                                 | Raúl + Román     | P0        | —                            |
| M6  | Settings service + REST: GET/PUT /wp/v2/settings (6 keys whitelisted)     | `SettingsService` sobre `options` table con `autoload=true`, GET lee todos los autoload, PUT valida whitelist, WP-compat field names      | Carmen           | P0        | —                            |
| M7  | Seeds: default settings (siteTitle, adminEmail, postsPerPage=10, etc.)   | Migration/seed crea las 6 options iniciales con defaults razonables; idempotente (ON CONFLICT DO NOTHING)                                 | Ingrid           | P1        | M6                           |
| M8  | Admin Pages feature: list + editor con `parent` selector y `menu_order`  | `features/pages/PagesListPage.tsx`, `PageEditorPage.tsx`, hooks `usePagesQuery`, sidebar entry; reutiliza componentes del posts editor    | Lucas            | P0        | M2                           |
| M9  | Admin Users CRUD UI: create user modal + edit user page + delete confirm | Extiende `UsersPage` con botón "New user", `UserEditorModal` (displayName, email, password opcional, role), delete con reassign dropdown | Marta            | P0        | M4                           |
| M10 | Admin Settings form: /settings route + formulario con 6 campos           | Nueva ruta `/settings`, `features/settings/SettingsPage.tsx` con form controlado, validación cliente, success toast                       | Marta            | P0        | M6                           |
| M11 | Mini-sprint demo spec (Playwright): pages CRUD + users CRUD + settings save | Spec E2E ampliada: crea page, la edita, listar users, crear user, cambiar settings, reload y verificar persistencia                       | Lucas + Marta    | P1        | M8, M9, M10                  |

**Total:** 11 tickets. 2 ADRs + 6 tickets backend + 3 tickets frontend + 1 demo E2E.

---

## Dependencias graph (ASCII)

```
M1 (ADR-025 pages) ──► M2 (pages REST) ──► M3 (schemas+tests)
                                     └───► M8 (admin pages UI)

M5 (ADR-026 bcrypt) ──► M4 (users CRUD) ──► M9 (admin users UI)

M6 (settings REST) ──► M7 (seeds defaults)
                  └──► M10 (admin settings UI)

M8 + M9 + M10 ──────► M11 (E2E demo spec)
```

Tres cadenas independientes (Pages / Users / Settings) paralelizables. Punto de convergencia único = M11 al cierre del sprint.

---

## Priorización por día (propuesta de ejecución)

- **Día 1 (lunes):** Román entrega M1 (ADR-025) + M5 (ADR-026 co-autor Raúl) antes de 12:00 para desbloquear a Carmen/Ingrid.
- **Día 1-2:** Carmen arranca M2 en paralelo con Ingrid en M4. Lucas prepara estructura `features/pages/` mientras espera M2 API shape del ADR.
- **Día 2-3:** Ingrid M3 (tests + OpenAPI pages). Carmen empieza M6 (settings). Marta arranca M9 (users UI) con API real de M4.
- **Día 3-4:** Lucas M8 (admin pages) contra M2 en verde. Ingrid M7 seeds. Marta M10 (settings UI) contra M6.
- **Día 4-5:** M11 E2E spec. Buffer para bugfixes y revisiones PR cruzadas. Feature freeze día 4 EOD.
- **Día 5:** Review + demo + retro corta.

---

## Definition of Done (mini-sprint)

- [ ] ADR-025 + ADR-026 Accepted antes del cierre.
- [ ] 3 áreas con endpoints REST WP-compat (pages, users CRUD, settings).
- [ ] Tests WP-conformance para pages (mínimo 8 casos) + users CRUD (mínimo 6 casos) + settings (mínimo 4 casos).
- [ ] Admin panel: 3 entries nuevos en sidebar (Pages, Settings), users page ampliada con CRUD.
- [ ] E2E demo spec verde en Playwright.
- [ ] OpenAPI actualizada con los 3 surfaces.
- [ ] 0 errores typecheck / 0 errores ESLint / prettier aplicado.
- [ ] PR reviews: M1/M5 firma Román; M4 firma Helena (password handling); resto peer review.

---

## NO-DO explícito (para evitar scope creep)

- **Pages hierarchy recursiva en admin** (tree view con expand/collapse) — Sprint 8+. MVP: selector `parent` flat con todas las pages listadas.
- **Password reset flow** (email token, recuperación) — requiere mailer service, fuera de scope.
- **Settings con permisos granulares por capability** — MVP: admin requerido para PUT, lectura pública para GET.
- **Custom settings beyond whitelist** — Sprint 8+ vía plugin API; ahora hardcoded para cerrar contract.
- **Page revisions / trash workflow** — heredamos lo que ya hay en posts, sin añadir features específicas.
- **User avatars / gravatar integration** — endpoints devuelven URLs vacías; integración real = Sprint 8+.

---

## Riesgos y mitigaciones

| Riesgo                                                                 | Probabilidad | Impacto | Mitigación                                                                                   |
| ---------------------------------------------------------------------- | ------------ | ------- | -------------------------------------------------------------------------------------------- |
| Handler posts refactor para parametrizar `postType` rompe tests existentes | Media        | Alto    | M1 ADR define contrato preciso. Refactor defensivo: nuevo handler factory, no in-place edit. |
| bcrypt nativo en Alpine/Docker falla build                              | Baja         | Medio   | Raúl spike 30min day 1 antes de decidir; alternativa `bcryptjs` puro JS si build rompe.     |
| Settings + autoload cache invalidation con plugins activos             | Baja         | Medio   | Sprint MVP: sin cache. Bust on PUT. Cache entra con ADR propio en Sprint 8+.                |
| UI Pages editor divergente de Posts editor (UX inconsistente)          | Media        | Bajo    | Lucas reutiliza componentes de `features/posts/components/`, NO copia-pega.                 |

---

## Referencias cruzadas

- **Reutiliza:** ADR-007 (slug auto-suffix), ADR-009 (context=view|edit), ADR-005 (hooks async boundary).
- **No toca:** ADR-017 (bridge Tier 2), ADR-020 (plugin loader), ADR-023 (plugin registry). Bridge sigue aplicando a pages via `the_content` hook de forma transparente (gratis).
- **Sprint 8 pickup:** pages hierarchy tree view, password reset email flow, settings capabilities, user avatars.

---

## Sign-off

- **Autor:** Román, 2026-04-19 (Proposed).
- **Accept gate:** presentar a Tomás + Martín en reunión de planning del mini-sprint. Escalada a Alejandro si scope se discute.
