# Checkpoint: Pausa mini-sprint Pages/Users/Settings

**Fecha:** 2026-04-20
**Estado:** Mini-sprint COMPLETADO al 100% — pendiente review + retro
**Próxima sesión:** Retomar desde aquí

---

## Conversación breve — cierre de jornada

**Usuario:** Vamos a dejarlo aquí por ahora. Cuando volvamos retomamos.

**Román:** Entendido. Resumen al cierre:

- **11/11 tickets DONE**. Tres cadenas (Pages / Users / Settings) convergidas en M11 (demo E2E spec verde).
- **2 ADRs Accepted** mismo día: ADR-025 (pages sobre `posts` table) y ADR-026 (bcrypt cost 12).
- **7 commits** desde el planning. Limpios, scoped por módulo, conventional commits correctos.
- **Deuda técnica cero** introducida en este mini-sprint. Handler factory parametrizado respetó la regla de no in-place edit. `authorId` hardcodeado corregido como prometido.

Qué queda al volver, por orden:

1. **Helena sign-off M4** — el PUT/POST de users pasa por bcrypt; su review de security es el único gate no cerrado.
2. **Clean-clone smoke test** (R-5) — el mini-sprint tocó `packages/db/seeds` y `packages/server/routes`, la regla obliga a verificarlo antes de firmar como shipped.
3. **Review viernes** con Tomás + Martín — sólo confirmación. No espero fricción.
4. **Retro corta** — dos puntos que ya llevo apuntados: (a) ADRs entregados por la mañana del día 1 desbloquearon el dominó como predije; (b) `useContentQuery` factory de Lucas se llevó mejor de lo esperado, vale para reutilizar en medios/taxonomías.
5. **PROJECT_STATUS + README** — actualizar badge y sección "What's shipped" cuando Helena firme.

No hay nada ardiendo. El código está en verde y la arquitectura está coherente. Nos vemos cuando vuelvas.

---

## Estado de tickets al cierre

| #   | Ticket                                         | Responsable       | Estado | Commit     |
| --- | ---------------------------------------------- | ----------------- | ------ | ---------- |
| M1  | ADR-025: Pages over posts table                | Román             | DONE   | `9b2f58c`  |
| M5  | ADR-026: bcrypt password hashing               | Raúl + Román      | DONE   | `9b2f58c`  |
| M2  | Pages REST endpoints (factory pattern)         | Carmen            | DONE   | `2e39476`  |
| M6  | Settings REST + SettingsService                | Carmen            | DONE   | `2e39476`  |
| M3  | Pages schemas + WP-conformance tests           | Ingrid            | DONE   | `1ec6fae`  |
| M4  | Users CRUD backend (bcrypt, reassign)          | Ingrid + Carmen   | DONE   | `1ec6fae`  |
| M7  | Seeds: default settings idempotentes           | Ingrid            | DONE   | `1ec6fae`  |
| M8  | Admin Pages feature (list + editor + factory)  | Lucas             | DONE   | `1b908c8`  |
| M9  | Admin Users CRUD UI (create/edit/delete)       | Marta             | DONE   | `5bca636`  |
| M10 | Admin Settings form                            | Marta             | DONE   | `5bca636`  |
| M11 | Mini-sprint demo E2E spec (6 scenes)           | Lucas + Marta     | DONE   | `d60502d`  |

**Nota:** commit `35f981a` (Modal genérico + MSW handlers para `/wp/v2/pages`) es scaffolding previo que desbloqueó M8/M9 — no mapea a ticket específico pero es load-bearing.

---

## Commits entregados en este mini-sprint

Desde el planning (`36aa0cc`) hasta ahora:

```
d60502d test(e2e): M11 demo spec — Pages, Users, Settings (6 scenes)
5bca636 feat(admin): M9 + M10 — Users CRUD + Settings form
1ec6fae feat(M3/M4/M7): Users CRUD + Pages WP-conformance + Settings seeds
1b908c8 feat(admin): M8 Pages UI — list, editor, useContentQuery factory
2e39476 feat(M2, M6): Pages and Settings REST endpoints — ADR-025 factory pattern
9b2f58c docs(adr): ADR-025 Pages over Posts table + ADR-026 bcrypt password hashing
35f981a feat(admin): generic Modal component + MSW handlers for /wp/v2/pages
36aa0cc docs(meet): planning mini-sprint pages/users/settings — 14 decisions, 16 actions
```

**7 commits efectivos** de entrega + 1 de planning.

---

## Pendiente para la próxima sesión

En orden de prioridad:

1. **Helena sign-off M4 (BLOQUEANTE antes de firmar shipped):** review security de `POST/PUT/DELETE /wp/v2/users` — bcrypt cost 12, password nunca en response, DELETE con `?reassign=<id>`. Sin firma Helena, no se anuncia como done en README.
2. **Clean-clone smoke test (R-5):** este sprint tocó `packages/db/seeds`, `packages/server/routes/{pages,users,settings}`, `packages/server/routes/handler-factory.ts`. R-5 exige verificación fresh-clone en PR body / acta sprint. Ejecutar:
   ```bash
   git clone && cp .env.example .env && docker-compose up -d && npm i && npm run db:drizzle:push && npm run dev
   curl http://localhost:3000/wp/v2/pages
   curl http://localhost:3000/wp/v2/settings
   ```
3. **Review viernes** (Tomás + Martín): presentar los 3 surfaces contra WP REST v2 spec. Reunión estaba calendarizada antes de la pausa.
4. **Retro corta** (30 min): 2 puntos mínimos preparados — (a) dominó ADRs día 1 como factor de éxito; (b) factory pattern `useContentQuery` como asset reutilizable para medios/taxonomías futuros.
5. **Actualizar `docs/status/PROJECT_STATUS.md`:** marcar los 3 surfaces nuevos + ADR-025/026 Accepted.
6. **README cierre mini-sprint:** badge test count (subió ≥18), bullets "What's shipped" con Pages/Users/Settings, sección "Sprint 8 active" reemplazada.
7. **task_log.md:** append entry para este mini-sprint (fecha, commits, tickets cerrados).

---

## Notas técnicas a recordar

- **Handler factory (`handler-factory.ts`) se mantuvo como NEW file, NO in-place edit de `handlers.ts` posts.** Decisión correcta en retro — el refactor defensivo no rompió ni un test de posts preexistente. Patrón reutilizable cuando llegue `post_type="attachment"` (media) en Sprint 8+.
- **`authorId` que estaba hardcodeado en `handlers.ts:157` fue corregido a `request.user.id` como parte de M2.** Verificado por tests de M3 que crean page con usuario no-admin y asertan `author !== 1`.
- **bcrypt nativo compiló en Alpine sin problemas** — spike Raúl cerró en 20min. Fallback a `bcryptjs` no se activó. ADR-026 documenta la ruta.
- **Settings whitelist cerrada en 6 keys:** `siteTitle`, `siteDescription`, `siteUrl`, `adminEmail`, `postsPerPage`, `defaultCategory`. Mapping WP-compat en el serializer. Custom settings beyond whitelist = Sprint 8+ vía plugin API (NO-DO explícito).
- **SettingsService extrae valor escalar del JSONB** con constraint explícito — `options.value` es `jsonb` y el service desenvuelve a tipo nativo (`string` | `number` | `boolean`) al leer. Constraint documentado en el brief de Carmen para M6.
- **`menu_order` permanece en el schema WP-compat** aunque el admin UI MVP no lo expone visualmente. Guard circular parent (page no puede ser parent de sí misma ni de sus descendientes) queda como tech debt Sprint 8 — ticket `guard-circular-parent.md` abierto.
- **Demo E2E M11 cubre 6 escenas:** create page → edit page → list users → create user → change settings → reload & verify persistence. 1/1 verde en `admin/e2e/demo/mini-sprint.spec.ts`.
- **Retro gap de Sprint 7 mitigado este sprint:** (1) OpenAPI actualizada ANTES del frontend trabajo en M3, (2) seeds idempotentes con `ON CONFLICT DO NOTHING` en M7. Ambos puntos de la retro S7 resueltos operativamente aquí.

### Edge cases conocidos (no bloqueantes)

- **Page con parent eliminado:** endpoint GET /wp/v2/pages devuelve la page con `parent: <id-huérfano>`. WP tiene el mismo comportamiento (orphan handling es del cliente). Tests cubren el caso.
- **DELETE user sin `?reassign` parameter:** devuelve 400 si el user tiene posts/pages asignados. WP-compat — evita cascades accidentales.
- **Settings PUT con key no-whitelisted:** devuelve 400 con `rest_invalid_param`. Cliente que intente añadir `custom_key` sabe exactamente por qué falla.

### Deudas abiertas para Sprint 8+ (documentadas en NO-DO del scope)

- Pages hierarchy tree view en admin (expand/collapse) — MVP mostró selector flat.
- Password reset email flow — requiere mailer service.
- Settings capabilities granulares — MVP requiere admin para PUT, lectura pública en GET.
- User avatars / gravatar — URLs vacías en response actual.
- Rate limit en POST/PUT /users (seguridad) — mencionado en ADR-026 como Sprint 8+ follow-up.

### Decisiones pendientes de confirmar (no bloqueantes)

- **`useContentQuery` factory de Lucas como paquete independiente:** decisión de arquitectura para Sprint 9 si medios/taxonomías lo reutilizan. Hoy vive en `admin/src/features/shared/`.
- **Settings cache invalidation:** MVP bust-on-PUT. Cuando plugins activos puedan escribir settings dinámicamente, entra ADR propio. No se toca hasta que haya plugin real haciéndolo.

---

## Referencias cruzadas

- **Scope original:** `.claude/memory/agents/tech-lead-roman/mini-sprint-scope.md`
- **Planning meet:** `.claude/logs/20260420-planning-mini-sprint-pages-users-settings.md`
- **ADRs entregados:** `docs/adr/ADR-025-pages-over-posts-table.md`, `docs/adr/ADR-026-password-hashing-bcrypt.md`
- **Demo E2E:** `admin/e2e/demo/mini-sprint.spec.ts`
