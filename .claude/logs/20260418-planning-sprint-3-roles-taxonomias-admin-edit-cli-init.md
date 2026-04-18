# Reunión: Planning Sprint 3 — Roles, Taxonomías, Admin Edit, CLI Init

**Fecha:** 2026-04-18
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Tomás (Scrum Master), Martín (Ops Manager)
**Duración estimada:** 90 min

---

## Preparación Individual

### Alejandro (CEO)

**Puntos a aportar:**

- Sprint 3 debe dejar NodePress demostrable a externos: repo público 14-05, TTFA <5 min fresh clone
- Roles reales = credibilidad ante CTOs en outreach; sin auth real no hay demo sería
- Licencia dual (MIT core + GPL plugins) debe estar decidida antes de repo público
- Outreach 15 calls ICP-1 arranca 24-04; feedback de esas calls puede cambiar backlog Sprint 3 → planificar punto de ajuste
- Demo ≤3 min en README: Lucas + Marta entregan, Valentina revisa copy

**Preocupaciones:**

- Feature freeze 12-05 con repo público 14-05 deja solo 2 días para QA final — muy justo
- Si taxonomías se demoran, bloquean la demo "post con categoría" que es lo que esperan los CTOs
- CLA Assistant 23-04 (jueves) bloquea contribuciones externas hasta que esté activo

### Román (Tech Lead)

**Puntos a aportar:**

- ADRs 010/011/012 llevan semanas en Proposed — gate formal antes de Sprint 3 día 1, 11:00
- ADR-020 Plugin Loader Runtime necesario para que "plugin system" no sea marketing vacío
- ADR-021 Theme↔Core integration: sin contrato formal el theme-engine es una caja negra
- Schema DB ya tiene `roles text[]` + `capabilities jsonb` en tabla users — no es esquema nuevo, es leer lo que ya existe
- `disposeAll` D-014 en context.ts:60 tiene TODO de timeout 5s — pequeño pero es deuda técnica visible
- Taxonomías: schema completo (`terms` + `term_relationships`) — solo faltan handlers + serializer WP-compat

**Preocupaciones:**

- 14 tickets en 2 semanas es el límite real de capacity tras calibrar Sprint 1-2
- Plugin Loader puede abrirse como can of worms — scoping estricto: solo cargar plugins JS/TS desde directorio, sin resolución dinámica de dependencias

### Ingrid (Lead Backend)

**Puntos a aportar:**

- Spec OpenAPI taxonomías PRIMERO (día 1-2) — bloquea implementación Carmen
- `requireAdmin` actual lee token pero no valida contra DB: un token válido de usuario no-admin pasa — hay que corregir
- Bridge `renderShortcodes` actual no tiene timeout; si php-wasm cuelga, request cuelga — ticket Sprint 3
- Spec `GET /wp/v2/terms`, `GET /wp/v2/categories`, `GET /wp/v2/tags` — 3 endpoints distintos pero misma lógica
- 9 integration tests con Postgres real (#28) ya en verde — taxonomías pueden seguir mismo patrón

**Preocupaciones:**

- `context=edit` requiere admin real (roles DB), no solo token Bearer — circular dependency con ticket #44
- `GET /wp/v2/users/me` es P2 pero CTOs van a preguntar en demo — hay que tenerlo aunque sea stub

### Tomás (Scrum Master)

**Puntos a aportar:**

- Sprint 3 tiene 14 días hábiles (05-05 → 16-05); con 15% buffer = ~12 días efectivos de trabajo
- Retro Sprint 1 async: lanzar 30-04, cerrar 04-05, consolidar 05-05 AM (antes del planning)
- Temperature checks: 05-05 antes del planning + 12-05 día de freeze
- Daily async GitHub Discussions — ya funciona, mantener formato 3 líneas
- DoD actualizada: incluye tests (>80% coverage) + OpenAPI actualizada + memoria agentes

**Preocupaciones:**

- Sin outreach signal (calls 24-04 → 02-05) antes del planning, planificamos a ciegas
- Propuesta: planning 05-05 AM, revisión señal outreach 05-05 PM, ajuste backlog 06-05 si hay cambio material
- 14 tickets es techo — si Alejandro añade más, hay que quitar algo equivalente

### Martín (Ops Manager)

**Puntos a aportar:**

- GitHub Issues Sprint 3 (#44-#57 aprox.) con P0/P1/P2 antes del 21-04
- Release readiness checklist: Helena + Martín, lista 13-05 EOD
- Mapping table PROJECT_STATUS ↔ GitHub Issues — mantener como en Sprint 2
- Call-log template ya creado (commit 8beb2fd) — listo para outreach 24-04
- Capacity: sin nuevos miembros hasta Sprint 4, mismo equipo × 2 semanas

**Preocupaciones:**

- Fecha repo público (14-05) está en calendario pero no hay owner de la checklist todavía
- Demo video (Playwright spec ya creado) necesita ser regenerado con features Sprint 3 antes del 14-05

---

## Conversación

**Tomás:** Antes de entrar en tickets, quiero proponer una cosa de proceso. Las calls de outreach arrancan el 24-04 y terminan el 02-05. El planning de Sprint 3 es el 05-05. Tenemos 3 días de margen para integrar la señal. Propongo: planning AM del 05-05, revisión de calls PM, y si hay algo material, ajuste el 06-05.

**Alejandro:** Me parece correcto. No planifico backlog sin escuchar a los 15 CTOs. Si todos me dicen "necesito WooCommerce" pues habrá que repensar el Sprint 3. Dicho eso, hay cosas que son inamovibles: auth real, taxonomías, CLI funcional. Sin eso no hay demo creíble.

**Román:** Estoy de acuerdo con Tomás en el proceso. Y con Alejandro en las tres prioridades. Añadiría una cuarta: los ADRs 010, 011 y 012 llevan semanas en Proposed. Antes de Sprint 3 día 1 a las 11:00 necesito que estén Accepted o explícitamente rechazados. No puedo implementar CLI sin ADR-010 firmado.

**Martín:** ¿Quién tiene que firmar esos ADRs? ¿Es decisión de Román o necesita quórum?

**Román:** ADR-010 (CLI) y ADR-011 (theme-engine) los firmo yo con Ingrid. ADR-012 (plugin-api) necesita a Alejandro también porque tiene implicaciones de licencia.

**Alejandro:** Me lo mandas el 04-05 y lo leo en el vuelo. Tiene quince minutos de decisión, no de debate.

**Ingrid:** Antes de hablar de tickets, hay algo que me preocupa del contexto actual. El `requireAdmin` que implementé en Sprint 2 valida el Bearer token pero no consulta la base de datos. Cualquier token válido pasa, aunque el usuario sea un suscriptor. El ticket #44 de roles reales es P0 no por diseño sino porque sin él `context=edit` está roto.

**Román:** Confirmado. Lo sabemos desde ADR-009. Está en la deuda técnica. ¿Cuánto tiempo estimas para el fix?

**Ingrid:** Un día si el schema está bien. Y está bien — `roles text[]` + `capabilities jsonb` ya están en `users`. Es solo cambiar `requireAdmin` para que haga `SELECT roles FROM users WHERE id = $tokenUserId` y compruebe que incluye `administrator`.

**Tomás:** Perfecto. #44 es P0 día 1. ¿Qué más es P0?

**Román:** Las taxonomías. Ingrid, ¿cuánto tardas en tener la spec OpenAPI completa para que Carmen pueda arrancar?

**Ingrid:** Día 1 o día 2 máximo. Son tres endpoints: `GET /wp/v2/categories`, `GET /wp/v2/tags`, `GET /wp/v2/taxonomies`. El schema está en DB — `terms` + `term_relationships`. La serialización WP-compat ya sé cómo hacerla. Me bloqueo yo misma si no acabo la spec primero.

**Martín:** ¿Tiene dependencias el editor de posts en admin con las taxonomías?

**Lucas:** _(referenciado)_ El editor necesita poder asignar categorías y tags a un post. Si las taxonomías no tienen endpoints, el editor puede guardar posts pero sin clasificación. Esto lo vi al revisar el wireframe de Sofía. Propongo: primero spec + CRUD taxonomías (Ingrid + Carmen), luego integración en el editor (yo). Secuencia, no paralelo.

**Román:** Correcto. Y eso implica que el editor de posts en admin es P1, no P0. El P0 es tener taxonomías funcionando en REST.

**Alejandro:** Román, ¿y el CLI? Mencionas que necesitas ADR-010. ¿Para qué lo quiere el usuario en Sprint 3?

**Román:** Para el TTFA. "Time To First Article". El objetivo es <5 min en fresh clone. Sin `npx nodepress serve` y `npx nodepress migrate` el usuario tiene que leer 3 páginas de documentación antes de ver algo. Con el CLI es `npm install -g nodepress && nodepress migrate && nodepress serve`. Eso es lo que marca la diferencia para el repo público.

**Tomás:** ¿Cuánto tiempo cuesta el CLI?

**Román:** Raúl puede tener `serve` + `migrate` en 2 días. Son wrappers sobre lo que ya existe. El riesgo es el publish a npm — necesita CI step adicional. Helena puede manejarlo.

**Martín:** Añado ese CI step al checklist de release readiness. Junto con Helena.

**Ingrid:** Sobre el bridge php-wasm — detecté que `renderShortcodes` no tiene timeout. Si php-wasm se congela, la request cuelga indefinidamente. Es una bomba de tiempo para producción.

**Román:** D-014 en context.ts:60 tiene el TODO del timeout `disposeAll`. Son el mismo patrón. Raúl lo puede hacer en medio día — añadir `AbortSignal` con 5s timeout al bridge call. Incluye en el Sprint.

**Tomás:** Voy a consolidar lo que tenemos hasta ahora en P0/P1/P2 y vemos si cabe en 14 tickets.

**Tomás:** P0 (bloqueantes para demo): #44 auth roles DB, spec taxonomías OpenAPI, CRUD taxonomías REST, CLI serve+migrate, timeout bridge php-wasm, ADRs 010/011/012 accepted.

**Tomás:** P1 (importante para repo público): admin editor posts con asignación taxo, `GET /wp/v2/users/me`, media stub `GET /wp/v2/media → []`, ADR-020 Plugin Loader, ADR-021 Theme↔Core, release checklist.

**Tomás:** P2 (nice to have): users readonly endpoint, refinamiento visual dashboard #23, demo video regenerado.

**Alejandro:** ¿Cuántos tickets son en P0?

**Tomás:** Unos seis o siete si contamos la spec de taxonomías separada de la implementación.

**Román:** La spec no es un ticket de dev — es entregable de Ingrid, 1-2 días, bloquea a Carmen. Lo cuento como ticket pero es tarea de diseño de API.

**Martín:** Con 14 tickets máximo y 6-7 P0, nos quedan 7-8 para P1. Es viable si no hay sorpresas.

**Alejandro:** ¿Qué es lo que más riesgo tiene?

**Ingrid:** Las taxonomías. No por la implementación — el schema está, el patrón está. El riesgo es que WP tiene muchos edge cases en taxonomías (jerarquía, slugs, conteos). Si intentamos ser 100% compat en Sprint 3 nos pasa como con el slug auto-sufijo en Sprint 2.

**Román:** Propongo: taxonomías WP-compat mínima. Campos que sirven para categorías y tags planas. Sin jerarquía en Sprint 3. ADR si nos desviamos.

**Ingrid:** Acepto. Jerarquía como debt documentada en ADR-020 o en un ADR nuevo.

**Tomás:** ¿Hay algo que no cabe y debería caer al backlog Sprint 4?

**Román:** El dashboard visual #23 — Lucas lo empezó bien pero los CTOs no van a valorar eso en el demo. Editor funcional sí, gráficos bonitos no.

**Alejandro:** De acuerdo. #23 a Sprint 4 opcional.

**Tomás:** Y el feature freeze es 12-05 a las 12:00. Esto no es negociable — necesito 2 días para QA + checklist antes del repo público el 14-05.

**Román:** Confirmado. Lo pongo en CLAUDE.md del proyecto si hace falta.

**Martín:** Yo cierro los Issues de Sprint 3 en GitHub antes del 21-04 con los P0/P1/P2 que acabamos de acordar. Y el checklist de release readiness lo tengo listo el 13-05 EOD.

**Alejandro:** Perfecto. Sprint Goal entonces: NodePress operable y creíble — auth con roles reales, taxonomías WP-compat categorías y tags, admin edit flow completo, CLI serve y migrate, y repo público el 14-05 con TTFA menos de 5 minutos en fresh clone.

**Tomás:** Lo documento como Sprint Goal oficial. ¿Alguien tiene algo más?

**Ingrid:** Una cosa pequeña: `GET /wp/v2/users/me` lo haré de P1 aunque sea stub. Los CTOs van a hacer `curl /wp/v2/users/me` en la demo y si devuelve 404 es un punto negativo.

**Alejandro:** Bien visto. Stub que devuelva el usuario actual, aunque sea hardcoded si no hay tiempo para lo real.

**Román:** No hardcoded. Con #44 ya tenemos el user del token. Es un select más. Ingrid, ¿puedes encadenarlo con #44?

**Ingrid:** Sí, lo hago en el mismo PR. No es un ticket separado entonces.

**Tomás:** Perfecto. Queda registrado.

---

## Puntos Importantes

1. **Sprint Goal oficial** (Alejandro): "NodePress operable y creíble: auth con roles reales, taxonomías WP-compat (categorías + tags), admin edit flow completo, CLI serve+migrate, y repo público el 14-05 con TTFA <5 min en fresh clone."

2. **ADRs 010/011/012 gate** (Román): deben estar Accepted antes de 05-05 11:00. ADR-012 necesita firma de Alejandro (implicaciones de licencia).

3. **#44 auth roles DB es P0 día 1** (Ingrid): `requireAdmin` debe validar `roles` en DB, no solo el Bearer token. `GET /wp/v2/users/me` se encadena en el mismo PR.

4. **Spec OpenAPI taxonomías bloquea implementación** (Ingrid): Ingrid entrega spec día 1-2 de Sprint 3; Carmen arranca implementación en cuanto esté.

5. **Taxonomías WP-compat mínima, sin jerarquía** (Román + Ingrid): Sprint 3 solo categorías y tags planas. Jerarquía documentada como deuda en ADR.

6. **CLI `serve` + `migrate` es P0 para TTFA** (Román): Raúl implementa, ~2 días. Helena añade CI step de npm publish.

7. **Timeout bridge php-wasm** (Ingrid): `renderShortcodes` sin timeout es riesgo de producción. Raúl añade `AbortSignal` 5s, mismo patrón que D-014 disposeAll.

8. **Dashboard #23 a Sprint 4** (Alejandro): Admin editor funcional tiene prioridad sobre refinamiento visual.

9. **Proceso planning**: Planning 05-05 AM + revisión outreach signal 05-05 PM + ajuste backlog 06-05 si hay cambio material.

10. **Feature freeze 12-05 12:00 inamovible** (Tomás): 2 días QA + release checklist antes de repo público 14-05.

---

## Conclusiones

**Decisiones tomadas:**

- Sprint Goal: auth roles + taxonomías + CLI + admin editor + repo público 14-05
- 14 tickets máximo + 2 buffer
- ADRs 010/011/012 → Accepted gate antes de 05-05 11:00 (Román coordina, Alejandro firma ADR-012)
- ADR-020 Plugin Loader Runtime + ADR-021 Theme↔Core → Román los redacta en Sprint 3
- Taxonomías: WP-compat mínima sin jerarquía Sprint 3; deuda documentada en ADR
- `GET /wp/v2/users/me` encadenado en #44 (no ticket separado)
- #23 dashboard visual → Sprint 4 opcional
- Feature freeze: 12-05 12:00, Román + Tomás enforzan

**Sin desacuerdos pendientes.**

---

## Acciones

| #   | Acción                                                  | Responsable           | Plazo                |
| --- | ------------------------------------------------------- | --------------------- | -------------------- |
| 1   | ADR-010/011 review + Accepted gate                      | Román + Ingrid        | 04-05 EOD            |
| 2   | ADR-012 revisar implicaciones licencia + firma          | Alejandro             | 04-05 (vuelo)        |
| 3   | ADR-020 Plugin Loader Runtime (draft)                   | Román                 | Sprint 3 día 2       |
| 4   | ADR-021 Theme↔Core integration (draft)                  | Román                 | Sprint 3 día 3       |
| 5   | GitHub Issues Sprint 3 (#44-#57) con P0/P1/P2           | Martín                | 21-04                |
| 6   | Spec OpenAPI taxonomías completa                        | Ingrid                | Sprint 3 día 1-2     |
| 7   | #44 auth roles DB + `GET /wp/v2/users/me`               | Ingrid                | Sprint 3 día 1-2     |
| 8   | CRUD taxonomías REST (tras spec Ingrid)                 | Carmen                | Sprint 3 día 3-5     |
| 9   | CLI `serve` + `migrate` commands                        | Raúl                  | Sprint 3 día 1-2     |
| 10  | Timeout `renderShortcodes` bridge + `disposeAll` D-014  | Raúl                  | Sprint 3 día 3       |
| 11  | Admin editor posts con asignación taxonomías            | Lucas                 | Sprint 3 día 4-8     |
| 12  | Media stub `GET /wp/v2/media → []`                      | Raúl                  | Sprint 3 día 1 (~2h) |
| 13  | CI step npm publish CLI                                 | Helena                | Sprint 3 día 3       |
| 14  | Release readiness checklist                             | Helena + Martín       | 13-05 EOD            |
| 15  | Retro Sprint 1 async: lanzar                            | Tomás                 | 30-04                |
| 16  | Retro Sprint 1 async: consolidar + planning Sprint 3 AM | Tomás                 | 05-05 AM             |
| 17  | CLA Assistant configuración                             | Alejandro + Eduardo   | 23-04                |
| 18  | Demo ≤3 min README + dual license docs                  | Alejandro + Valentina | 12-05                |

---

_Generado por /meet — Trinity_
