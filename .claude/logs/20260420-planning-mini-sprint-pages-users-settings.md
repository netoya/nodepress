# Reunión de Planning — Mini-Sprint: Pages, Users, Settings

**Fecha:** 2026-07-14 (lunes) · 09:00 — 09:47
**Participantes:** Tomás (Scrum Master, facilitador), Román (Tech Lead), Martín (Ops Manager), Ingrid (Lead Backend), Lucas (Lead Frontend)
**Duración estimada:** 45 min

---

## Preparación Individual

**Román:** Scope técnico cerrado en 11 tickets, 3 cadenas paralelas (Pages/Users/Settings). 3 decisiones load-bearing: Pages = post_type="page" (0 migraciones), bcrypt(12) en Users, Settings key→value sobre options existente. ADR-025 + ADR-026 antes de 12:00 día 1. Ruta crítica: M2 + M4. menu_order en scope (WP-compat obligatorio). Preguntas abiertas: fallback bcryptjs, circular parent en frontend, distribución tests M3.

**Tomás:** Ventana propuesta 14-18 julio. Pregunta al equipo: ¿mini-sprint o Sprint 8 completo? Ceremonias ligeras. Feature freeze jueves 17 a las 12:00 (no EOD). Helena debe estar en el loop para M4. Retro S7 no registrada en logs — gap de proceso a resolver.

**Martín:** Ventana alineada. GitHub Issues antes del EOD del planning. 9 P0, 2 P1. Capacity: 21 persona-días efectivos con buffer 15%. ADRs son el cuello de botella del lunes. Helena no está en el planning — disponibilidad desconocida.

**Ingrid:** Handler factory confirmado (`createPostHandler(postType)` en fichero nuevo). listPosts no filtra por type — deuda activa en M2. PageSchema extiende PostSchema, parent + menu_order en root. Distribución M4: Ingrid = POST + GET/:id (bcrypt), Carmen = PUT + DELETE (transacción reassign). DELETE necesita db.transaction(). Settings JSONB serializer debe extraer escalar. Tests M3 los escribe Ingrid.

**Lucas:** M8 son 2 días reales (no 1). Propone useContentQuery hook factory. Modal genérico a extraer el lunes AM antes de que Marta arranque M9. Brief de M9 debe cerrarse hoy: UserEditorModal mode="create"|"edit". parent como integer ID en root. Circular parent = validación en cliente suficiente para MVP.

---

## Conversación

**Tomás:** Buenos días. Son las nueve en punto, empezamos. Cuarenta y cinco minutos para salir con el sprint comprometido y sin hilos sueltos. Check-in rápido: ¿alguien tiene algo que debamos saber antes de arrancar? ¿Algo que afecte a la semana?

**Ingrid:** Sin novedad. Llego descansada. M4 lo tengo claro en la cabeza.

**Lucas:** Bien. Llevo el fin de semana dando vueltas al hook factory de pages — tengo ideas concretas.

**Martín:** Funcional. Los Issues los creo en GitHub antes del EOD si cerramos scope aquí.

**Román:** Listo. M1 y M5 salen hoy antes de las doce si no nos enrollamos.

**Tomás:** Bien. Antes de que Román abra el scope, necesito que el equipo responda una pregunta: ¿mini-sprint de cinco días o Sprint 8 completo de dos semanas? No es trivial — el formato cambia las ceremonias, el buffer y la presión de entrega.

**Martín:** Mi posición es clara: cinco días. 9 tickets P0, 2 P1, capacity de 21 persona-días efectivos. Dos semanas sería Sprint 8 que aún no hemos planificado con Alejandro. No mezclemos.

**Román:** Cinco días es lo correcto técnicamente. Las tres cadenas están acotadas. Dos semanas introduce presión de rellenar backlog con cosas que no están maduras.

**Tomás:** Cerrado. Mini-sprint cinco días. Ventana: lunes 14 → viernes 18 de julio. Ceremonias: planning ahora, daily async, check-in miércoles EOD (15'), review+retro viernes PM (60'). Feature freeze: jueves 17 a las **12:00, no EOD**. Apuntadlo.

---

**Tomás:** Adelante Román. El scope.

**Román:** Once tickets, tres cadenas en paralelo:

```
M1 (ADR-025) → M2 (pages REST) → M3 (schemas+tests)
                              └→ M8 (admin pages UI)

M5 (ADR-026) → M4 (users CRUD) → M9 (admin users UI)

M6 (settings REST) → M7 (seeds)
                  └→ M10 (admin settings UI)

M8 + M9 + M10 → M11 (E2E demo)
```

Tres decisiones load-bearing que quiero acordar aquí, no en PR review. Primera: Pages reutiliza la tabla posts con type="page". Cero migraciones. El schema ya tiene parentId. Handler parametrizado — no in-place edit del handler de posts, sino createPostHandler(postType) en handler-factory.ts nuevo. Ingrid, ¿confirmado?

**Ingrid:** Confirmado. Y hay un problema activo que va en M2: listPosts no filtra por type. Si metemos pages en la tabla, GET /wp/v2/posts devolverá también las pages. Es deuda activa, no scope creep. Va en M2 junto con la parametrización.

**Román:** Bien visto. Lo anoto como constraint de M2. Algo más en pages, Ingrid?

**Ingrid:** Una pregunta para Lucas que necesito acordada antes de cerrar el schema. ¿El campo parent en el shape WP, lo necesitas como integer ID o como objeto embebido?

**Lucas:** ID, perfecto. No necesito el objeto completo — con el ID hago lookup si hace falta. ¿Y menu_order? ¿Root o meta?

**Ingrid:** Root. WP lo tiene en root. PageSchema extiende PostSchema con parent integer nullable y menu_order integer default 0, ambos en root. Así queda en OpenAPI.

**Lucas:** Perfecto. Eso simplifica el editor.

**Román:** Segunda decisión: bcrypt factor 12 para hashing de passwords. El riesgo es el build en Alpine — Raúl hace un spike de 30 minutos hoy antes de las 11:00. Si falla, pre-acordamos ahora mismo que el fallback es bcryptjs pure JS sin nueva decisión en sprint. ¿Martín?

**Martín:** Totalmente de acuerdo con pre-acordar el fallback hoy. Lo que no quiero es una reunión de emergencia a mitad de semana para decidir algo que podemos cerrar en diez segundos ahora. bcryptjs como fallback automático si el build nativo rompe. ¿Alguien se opone?

**Ingrid:** No me opongo. Pero necesito que Raúl documente el resultado en ADR-026 aunque sea en un párrafo. No puede quedar solo en Slack.

**Román:** Acordado. M5 lo recoge. Tercera decisión: Settings es servicio key-valor sobre la tabla options existente. Seis keys whitelisted: siteTitle, siteDescription, siteUrl, adminEmail, postsPerPage, defaultCategory. GET lee todos los autoload en una query. PUT valida whitelist. Sin cache en MVP — bust on PUT.

**Ingrid:** Una precisión importante. El campo value en options es JSONB. Si el serializer no extrae el valor escalar nativo, el endpoint puede devolver el objeto envuelto — «{"value": "Mi blog"}» en lugar de «"Mi blog"». Carmen necesita este detalle explícito en el brief de M6 antes de arrancar.

**Román:** Anotado como constraint de M6. Lucas, ¿algo de Settings desde el frontend?

**Lucas:** M10 necesita que defaultCategory cargue las categorías desde GET /wp/v2/categories. ¿Ese endpoint existe y devuelve id y name?

**Ingrid:** Existe. taxonomies/ está operativo desde el sprint anterior. Devuelve id, name, slug. Tienes lo que necesitas.

**Lucas:** Perfecto.

---

**Tomás:** Scope técnico acordado en las tres cadenas. Martín, ¿los números cierran?

**Martín:** 25 persona-días teóricos, 21 efectivos con buffer 15%. Los ADRs son el cuello de botella — M1 y M5 deben estar antes de las 12:00 del lunes para que Carmen e Ingrid no esperen. Con esa premisa, la distribución cuadra.

**Tomás:** Un momento. M8 — Lucas, en tu preparación apuntaste dos días, el scope dice uno. ¿Nos lo aclaras?

**Lucas:** El documento subestimaba M8. El parent selector tiene un edge case de referencias circulares. Más el hook factory, el router, la entrada en sidebar. Son dos días reales. Uno es optimista si no hay bloqueos.

**Tomás:** ¿Podemos acomodar dos días en el cronograma?

**Martín:** Con 21 días efectivos y tres cadenas paralelas, caben dos días para M8. Lo que no puede hacer es bloquear M11. Si Lucas termina M8 el jueves al mediodía, hay tiempo para cerrar M11 jueves tarde y viernes mañana. Justo pero factible.

**Román:** El edge case de circular en parent selector — ¿el backend lo valida o lo acepta silenciosamente?

**Ingrid:** No está en scope de M4. Si una page tiene parent=A y A tiene parent=esa_page, el backend acepta la inserción. La FK no cubre este caso.

**Román:** Mi recomendación: validación en cliente suficiente para MVP. El caso de jerarquía circular no ocurre en datos reales salvo programación activa. Lo apuntamos como tech debt Sprint 8. Lucas, ¿lo asumes?

**Lucas:** Acepto. Lo que necesito es que el selector excluya la page actual de la lista de parents posibles. Eso previene el caso más común. El caso indirecto — A apunta a B que apunta a A — lo dejo como TODO documentado en el código.

**Tomás:** Queda apuntado como deuda conocida, no como riesgo oculto. Siguiente: Helena. Martín, necesito que esto quede resuelto hoy. Helena no está en esta reunión y firma el review de M4. ¿Cuál es su disponibilidad?

**Martín:** No la he confirmado aún. Es mi acción de hoy antes de las 14:00. Si no consigo confirmación, lo escalo a Alejandro.

**Román:** Si Helena no confirma disponibilidad hoy, M4 puede implementarse pero no mergear. Ingrid, ¿puedes tener M4 en revisión para el miércoles EOD asumiendo que Helena confirma?

**Ingrid:** Si M5 está cerrado antes del mediodía del lunes y Raúl me pasa el resultado del spike, sí. La distribución que propongo: yo cubro GET/:id y POST con el hashing y la coordinación con Helena. Carmen lleva PUT y DELETE. El DELETE necesita una transacción explícita — reasignar posts al autor alternativo antes de borrar usuario. Sin transacción hay riesgo de FK. Que Carmen lo tenga claro desde el brief.

**Martín:** Anotado. Carmen — transacción en DELETE users. No es opcional.

**Tomás:** Hay otro tema antes de cerrar. La retro de Sprint 7. No está registrada en las memorias del equipo. ¿Alguien tiene los puntos?

*Pausa.*

**Román:** No la vi en los logs.

**Martín:** Tampoco. Si no está en .claude/logs/ es que no se documentó. Es un problema.

**Tomás:** Es exactamente el tipo de cosa que hace que repitamos errores. Ingrid, Lucas — ¿qué recordáis de S7?

**Ingrid:** El punto caliente era la falta de contratos OpenAPI antes de que el frontend arrancara. Lucas tuvo que trabajar contra MSW handlers que luego cambiaron.

**Lucas:** Exacto. Ese fue el principal. Y el secundario era que los seeds de prueba no eran idempotentes — Carmen tuvo que limpiar la DB a mano dos veces.

**Tomás:** Perfecto. Los documento hoy. Y noto que este sprint ya tiene ambas mitigaciones por diseño: M3 cierra OpenAPI antes de que Lucas necesite datos reales, y M7 es explícitamente ON CONFLICT DO NOTHING. Eso es mejora continua real.

---

**Tomás:** DoD. Román propuso: ADRs Accepted, endpoints WP-compat en tres áreas, mínimo 18 tests, E2E verde, OpenAPI actualizada. ¿Alguien añade algo?

**Ingrid:** La distribución de tests la confirmo: ocho casos WP-conformance para pages — los escribo yo, no Carmen — seis para users CRUD, cuatro para settings. Además, el patrón de tests de M4 es Testcontainers con base de datos real, no mocks manuales.

**Román:** Y añado al DoD: clean-clone smoke test antes del review del viernes.

**Tomás:** Anotado. También los logs de ceremonia en .claude/logs/. Este acta cuenta como el primero. Lucas, ¿algo del lado frontend?

**Lucas:** Una cosa. El modal genérico — necesito extraerlo antes de que Marta arranque M9. Me lleva medio día del lunes. Si no lo hago primero, Marta codifica el suyo y hay duplicación. Eso es medio día hoy que está en mi plan.

**Tomás:** ¿Factible en el lunes teniendo en cuenta que también esperas el ADR-025 para M8?

**Lucas:** Sí. Mientras espero el shape exacto de pages, extraigo el modal. No hay dependencia técnica entre las dos cosas. Marta puede arrancar M9 el martes con el modal disponible.

**Tomás:** Bien. Último punto: Román, me preguntaste si seguimos el mismo protocolo de scope freeze que Sprint 1. Sí, con un matiz. El freeze formal es el jueves a las 12:00. Pero cualquier ticket nuevo que alguien quiera meter después de hoy pasa por ti y por mí antes de entrar al board. No quiero sorpresas el miércoles.

**Román:** Acordado. Y la pregunta a Martín que tenía pendiente: menu_order — ¿puede diferirse a Sprint 8 para aligerar M3 y M8?

**Martín:** No. menu_order es WP-compat obligatorio en /wp/v2/pages. Si un cliente WordPress hace GET /wp/v2/pages y no ve menu_order en el response, falla la compatibilidad. No es nice-to-have.

**Román:** Entendido. Queda en scope.

**Tomás:** ¿Alguien tiene algo que no ha dicho y que si no lo dice hoy será un bloqueo el miércoles?

**Ingrid:** El authorId hardcodeado a 1 en handlers.ts línea 157. Al parametrizar el handler en M2, si no se corrige en ese momento, las pages creadas tendrán siempre author=1. No es scope creep — es deuda activa que introduce un bug silencioso.

**Román:** Incluido en M2 como constraint. Carmen lo ve en el brief: usar request.user.id, no el hardcoded. ¿Algo más?

*Silencio.*

**Tomás:** Cerramos. Son las nueve cuarenta y siete. Tres minutos bajo el objetivo. Buen trabajo.

---

## Puntos Importantes

1. **ADRs son el cuello de botella del día 1** — M1 (ADR-025) y M5 (ADR-026) deben estar cerrados antes de las 12:00 del lunes. Si se retrasan, Carmen e Ingrid esperan.
2. **bcryptjs pre-acordado como fallback automático** — Raúl spike antes de las 11:00, resultado documenta en ADR-026. Sin nueva decisión en sprint.
3. **Helena es gate bloqueante en M4** — sin firma, M4 no mergea aunque el código esté listo. Martín confirma disponibilidad antes de las 14:00 del lunes.
4. **listPosts debe filtrar por type en M2** — sin este fix, GET /wp/v2/posts devuelve también pages. Deuda activa, no scope creep.
5. **DELETE /users/:id necesita transacción explícita** — reasignar posts antes de borrar usuario. Sin transacción, riesgo de FK en base de datos.
6. **M8 son dos días reales** — el cronograma absorbe dos días si M8 termina el jueves al mediodía.
7. **Settings JSONB serializer debe extraer valor escalar** — constraint explícito en el brief de M6 para Carmen.
8. **authorId hardcodeado es deuda activa** — se corrige en M2 con request.user.id.
9. **Modal genérico extraído el lunes AM por Lucas** — prerequisito para que Marta arranque M9 el martes.
10. **Retro S7 no estaba documentada** — gap cubierto hoy. Puntos: (1) falta OpenAPI antes de que frontend arranque, (2) seeds no idempotentes. Ambos mitigados en este sprint por diseño.

## Conclusiones

- **Mini-sprint 5 días** acordado: 2026-07-14 → 2026-07-18. Feature freeze jueves 17 a las 12:00.
- **11 tickets, 3 cadenas paralelas** con convergencia única en M11. Scope no cambia respecto al doc de Román.
- **menu_order permanece en scope** — WP-compat no negociable.
- **14 acuerdos técnicos cerrados en sala**: handler factory, parent como integer en root, bcryptjs fallback pre-acordado, transacción en DELETE, JSONB serializer, authorId fix en M2, tests con Testcontainers, modal genérico extraído antes de M9, circular parent = tech debt S8.
- **Scope freeze activo desde hoy** — cualquier ticket nuevo pasa por Román + Tomás.
- **DoD acordado**: ADRs Accepted, endpoints WP-compat 3 áreas, ≥18 tests, E2E verde, OpenAPI actualizada, clean-clone smoke test, logs ceremonia.

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| A1 | Entregar M1 (ADR-025) en borrador | Román | Lunes 14 jul, 12:00 |
| A2 | Entregar M5 (ADR-026) con resultado de spike bcrypt | Raúl + Román | Lunes 14 jul, 12:00 |
| A3 | Spike bcrypt nativo en Alpine | Raúl | Lunes 14 jul, 11:00 |
| A4 | Confirmar disponibilidad de Helena para review M4 | Martín | Lunes 14 jul, 14:00 |
| A5 | Crear GitHub Issues para los 11 tickets (bloque contiguo) con labels | Martín | Lunes 14 jul, EOD |
| A6 | Etiquetar NO-DO del scope doc como sprint-8 en GitHub | Martín | Lunes 14 jul, EOD |
| A7 | Extraer Modal genérico antes de que Marta arranque M9 | Lucas | Lunes 14 jul, EOD |
| A8 | Cerrar brief de M9 (password mode create/edit) para Marta | Lucas | Lunes 14 jul, EOD |
| A9 | Arrancar M2 con fix listPosts (filtro type) y fix authorId (request.user.id) | Carmen | Martes 15 jul |
| A10 | Arrancar M4 con Testcontainers; DELETE con transacción explícita | Ingrid + Carmen | Martes 15 jul |
| A11 | Documentar puntos retro S7 en .claude/logs/ | Tomás | Lunes 14 jul, EOD |
| A12 | Brief cerrado de M6: JSONB serializer escalar | Ingrid → Carmen | Lunes 14 jul, EOD |
| A13 | Check-in mid-point con todas las cadenas | Tomás | Miércoles 16 jul, EOD |
| A14 | Feature freeze — nada nuevo entra al board | Todos | Jueves 17 jul, 12:00 |
| A15 | Clean-clone smoke test antes del review | Román (o designado) | Viernes 18 jul, AM |
| A16 | Review + retro mini-sprint | Todo el equipo | Viernes 18 jul, PM |

---

_Generado por /meet — Trinity_
