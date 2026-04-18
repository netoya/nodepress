# Reunión: Kickoff Sprint 2 — Hardening, ADRs, Tier 2 pilotos

**Fecha:** 2026-04-18
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Raúl (Dev Backend 2), Helena (IT Manager), Tomás (Scrum Master)
**Duración estimada:** 60 min

---

## Preparación Individual

### Alejandro (CEO)

- Sprint 1 cerró al 92%, demo 30-04 grabada, 148 tests verdes.
- Sprint 2 foco: hardening + ADRs + Tier 2 content-only (3 pilotos). Plan fases A/B/C RECHAZADO.
- Gates Sprint 2: ADR security Helena (23-04), CLA Assistant (23-04), ADRs 005-009 Accepted antes 24-04.
- Outreach 24-04 con pregunta NEUTRAL — no sobre plugins compat.
- Protocolo scope freeze activo. Tickets nuevos requieren Román + Tomás + Martín co-sign.

### Román (Tech Lead)

- 15 ADRs: 9 Accepted, 6 Proposed (013, 014, 016 listos para Accepted; 010/011/012 NO — son contratos sin implementación).
- ADR-015 Tooling runtime boundary: Sprint 2 semana 1.
- ADR-017 Tier 2 Bridge Surface: lunes 21-04 tras findings Raúl.
- Skeletons cli/theme-engine/plugin-api: 560 LOC cerrados arquitectónicamente, 0 deps nuevas.
- Línea roja: no aceptar 010/011/012 sin implementación. CB GC = Priority 1 Sprint 2.

### Ingrid (Lead Backend)

- #28/#29/#30 hardening completados. ADR-006/007 Accepted.
- ADR-013 sigue Proposed — pendiente firma Román.
- drizzle:push en producción = deuda activa. Requiere migrate con journal S2-W1.
- Bug excerpt.raw en serialize.ts — no bloqueante, entra S2-W1 Carmen.
- ADR-017 es gate para código Tier 2. Necesita fecha antes de que arranque.

### Raúl (Dev Backend 2)

- Spike ADR-008 Accepted: p95=2.40ms, 44 extensions confirmadas, memory estable.
- 3 pilotos viables: Footnotes, Shortcodes Ultimate, Display Posts (ninguno usa HTTP).
- cURL sync bloquea event loop — limitación documentada. CF7 = requiere async wrapper ADR nuevo.
- CircuitBreaker 17/17 tests. GC stale entries = Priority 1 Sprint 2.
- Opcache sin persistencia → singleton PHP-WASM recomendado para prod.

### Helena (IT Manager)

- CI: 2 workflows (ci.yml + smoke-fresh-clone.yml).
- ADR bridge security boundary: sin dependencia de ADR-015, puede escribirlo ya. Deadline 23-04.
- ADR bridge observability: Sprint 2 semana 1.
- Gaps CI: coverage artefact, PR lint, npm audit → backlog.
- drizzle:push = no apruebo despliegue DB sin journal.

### Tomás (Scrum Master)

- Sprint Goal propuesto: "NodePress operable en producción — migraciones historial, clean-clone <5min, ADRs sellados, Tier 2 surface congelado."
- 92% Sprint 1 done. Demo operativa. TTFA <5min establecida.
- Retro Sprint 1: lanzar asíncrona 30-04, cierre lunes 4-05.
- Acciones retro Sprint 0 pendientes: R-1, R-7, R-9.
- Riesgo: whiplash equipo post-reversión. Temperature check lunes individual.

---

## Conversación

**Tomás:** Antes de entrar en el sprint, quiero hacer un check-in rápido. Venimos de dos días muy intensos, una reversión de scope anoche, y ahora arrancamos Sprint 2. ¿Cómo está el equipo? ¿Alguien necesita procesar algo antes de planificar?

**Ingrid:** Yo bien. La reversión fue un poco rara porque habíamos trabajado varias horas en una dirección que luego se descartó, pero el comunicado de Alejandro lo dejó claro. No hay ambigüedad de lo que sigue. Prefiero eso a tener un scope nebuloso.

**Raúl:** Sin drama de mi lado. Lo del mapa fue un poc entretenido. El spike ya estaba, el verdict ya está. No cambió nada de lo que entregué.

**Alejandro:** Bien. Y lo digo públicamente: la noche del 18 fue un error mío de comunicación. El equipo interpretó razonablemente lo que tenía delante. Lo que me llevo es que cuando el PO dice "no vale", pregunto binaria antes de montar sesión 2. Eso está en el comunicado y en las memorias. Pasamos página.

**Tomás:** Perfecto. Entonces propongo Sprint Goal antes de entrar en tickets concretos. Mi propuesta: _"NodePress es operable en producción: migraciones con historial, clean-clone en menos de 5 minutos, ADRs arquitecturales sellados, y el surface Tier 2 definido y congelado."_ ¿Lo ve todo el mundo viable en 2 semanas?

**Román:** Lo veo viable, pero necesito puntualizar "ADRs sellados". No voy a proponer que aceptemos 010/011/012 ahora. Theme engine y plugin API loader real son Sprint 3+. Aceptarlos sin implementación crea deuda de contrato, no la cierra. Lo que sí se puede sellar esta semana son 013, 014, 016, y el ADR-015 que quedó comprometido en el post-mortem.

**Helena:** Estoy de acuerdo. Y lo que bloquea mi ADR de security boundary no es el scope de Román — yo puedo escribirlo ya contra los 3 pilotos actuales sin esperar ADR-015. Pero necesito saber: ¿el ADR-015 afecta el perimeter del bridge? Porque si Román está redefiniendo el boundary del runtime, mi análisis de attack surface puede cambiar.

**Román:** ADR-015 define el boundary _tooling_ — drizzle, tsx, NodeNext. No toca el bridge de php-wasm. Son capas distintas. Helena, puedes escribir el security boundary independientemente. No hay dependencia.

**Helena:** Bien. Entonces me comprometo: ADR bridge security boundary, jueves 23. Necesito esa fecha firme porque es gate para CLA Assistant y para que Raúl continúe con los pilotos.

**Alejandro:** CLA Assistant el jueves también está en mi agenda con Eduardo. Las dos cosas se mueven en paralelo, no en secuencia. Helena, si terminas antes del jueves, dímelo y adelantamos.

**Ingrid:** Quiero poner sobre la mesa algo que me preocupa: entrar a Sprint 2 con `drizzle:push` como método de migración en producción. No tenemos journal. Si algo sale mal en el schema, el recovery es manual. Esto no puede ir a semana 2 del sprint.

**Tomás:** ¿Cuánto esfuerzo es eso, Ingrid?

**Ingrid:** Carmen puede hacerlo en medio día con mi brief. Primero día de Sprint 2. No es complejo, es simplemente pasar de push a generate + migrate y commitear el journal. Lo bloqueo como S2-W1.

**Raúl:** Mientras hablo del spike: el verdict GO a Tier 2 está en ADR-008, confirmado el 19. Las métricas son buenas — p95 en 2.4ms con margen x20. Lo que documenté como limitación crítica es cURL sincrónica. Bloquea el event loop. Para los 3 pilotos que tenemos —Footnotes, Shortcodes Ultimate, Display Posts— ninguno hace HTTP. Están limpios. El problema de cURL lo tenemos si alguien mete Contact Form 7 más adelante.

**Román:** Bien. Entonces no tocamos cURL en Sprint 2. Documentado en ADR-008 como limitación conocida. Si en Sprint 3 queremos pilotos con network, abrimos ADR nuevo para el async wrapper. Sin saltarnos pasos.

**Raúl:** Sí, exacto. Solo quería que quedara explícito en el acta. No quiero que alguien en dos semanas diga "oye, vamos a meter CF7 rápido".

**Alejandro:** Anotado. Sprint 2 Tier 2 = los tres pilotos sin red. CF7 necesita ADR, timeline y señal de outreach antes de entrar al backlog.

**Ingrid:** Sobre ADR-013 — está en Proposed. Raúl tiene el stress test verde, los findings documentados. ¿Por qué no lo movemos a Accepted hoy mismo antes de la planning formal?

**Raúl:** Por mí bien. Los hallazgos están, el GC del CircuitBreaker es Priority 1 pero no bloqueante Sprint 2. Propongo: Accepted del ADR, y el GC como ticket Sprint 2 semana 1.

**Román:** Acepto la propuesta. Román firma ADR-013 Accepted. El GC de stale entries entra como ticket técnico, ownership Raúl, code review mío.

**Helena:** Hay otro gap que quiero nombrar aunque no sea urgente: CI corre tests pero no genera coverage report como artefacto, no hay workflow de PR lint, no hay `npm audit`. No los pongo en Sprint 2 como bloqueantes, pero quiero que estén en el backlog visible. Si un piloto de fuera revisa el repo el 14-05, quiero que el CI cuente una historia completa.

**Tomás:** ¿Eso entra en el Sprint Goal o va al backlog con prioridad media?

**Helena:** Backlog. El Sprint Goal se sostiene sin eso. Pero lo anoto como S2-infra-backlog para que no desaparezca.

**Alejandro:** Me parece bien. Lo que no entra al sprint goal tiene que estar visible de todas formas. Tomás, ¿puedes asegurarte de que esos ítems aparecen en el tablero de GitHub antes del lunes?

**Tomás:** Sí. Voy a estructurar el backlog Sprint 2 esta tarde con las categorías: Hardening, ADRs, Tier 2 Surface, Infra/CI, y Frontend pendiente con Lucas. Ojo — no hemos hablado de Lucas, Marta, Carmen en esta reunión. El track frontend necesita su propia sync antes de Monday planning.

**Román:** Lucas sabe lo que tiene. #23 dashboard visual refinement está pendiente de wireframes de Sofía. Si no llegaron el viernes, Lucas toma una decisión en la planning del lunes — refina sin spec o lo desplaza a Sprint 3. Yo lo hablo con él antes de las 10:00 del lunes.

**Alejandro:** Una cosa más antes de cerrar: outreach viernes 24. Eduardo y yo redactamos la pregunta neutra hoy o mañana. Quince calls con CTOs ICP-1, pregunta sobre stack actual y dolor real, no sobre plugins compat. Nada que reabre el mapa PHP-WASM. El equipo no tiene acción aquí salvo que yo o Eduardo preguntéis algo.

**Tomás:** Perfecto. Entonces para que yo pueda cerrar la planning: ¿alguien ve algo que bloquea el arranque del Sprint 2 el lunes 21?

**Ingrid:** No desde backend. Tengo el brief de drizzle ready para Carmen.

**Raúl:** Clear de mi lado. Estoy arrancando con el GC del CircuitBreaker y listos para el harness Tier 2 cuando ADR-017 esté firmado.

**Helena:** ADR security boundary jueves. Antes de eso, nada que me bloquee.

**Román:** ADR-013 → Accepted lo hago hoy antes de las 18:00. ADR-015 entra semana 1. ADR-017 —y esto es importante— lo escribo el lunes tras leer los findings finales de Raúl. No antes.

**Alejandro:** Bien. El lunes arrancamos. Tomás, tú tienes el Sprint Goal, la estructura del backlog, y el check de salud del equipo. El resto, a vuestros tracks.

**Tomás:** Cierro con una observación de proceso: el ciclo de reversión de anoche fue doloroso pero lo gestionamos bien. El comunicado de Alejandro llegó en horas, las memorias están actualizadas, nadie está quemado. Eso es madurez de equipo. Llevamos ese estándar al Sprint 2. ¿Algo más antes de salir?

**Ingrid:** Una cosa pequeña: ese bug en `serialize.ts` donde `excerpt` serializa con clave `raw` no declarada en OpenAPI. No es bloqueante pero quiero que entre en el backlog de Sprint 2 semana 1 antes de que algún piloto lo vea.

**Román:** Anota el ticket tú, Ingrid. Carmen lo cierra.

**Ingrid:** Hecho.

**Tomás:** Cerramos. Sprint 2 arranca el lunes 21 con claridad de scope, sin deuda de decisión colgante, y con el equipo descansado.

---

## Puntos Importantes

1. **Sprint Goal acordado**: "NodePress operable en producción — migraciones con historial, clean-clone <5 min, ADRs sellados, Tier 2 surface congelado." (Tomás/Alejandro)
2. **ADRs 010/011/012 NO se aceptan en Sprint 2** — contratos de funcionalidad futura sin implementación. Aceptarlos crearía deuda de contrato. (Román)
3. **ADR bridge security boundary → jueves 23-04** — gate para CLA Assistant y Tier 2 staging. Independiente de ADR-015. (Helena)
4. **drizzle:generate + migrate con journal — prioridad Sprint 2 día 1.** Carmen ejecuta, brief Ingrid. Sin esto, recovery de schema manual. (Ingrid)
5. **cURL sync = limitación ADR-008, fuera de Sprint 2.** Los 3 pilotos actuales no usan HTTP. CF7 requiere ADR nuevo. (Raúl, Román)
6. **ADR-013 CircuitBreaker → Accepted hoy.** GC stale entries como ticket S2-W1, Raúl. (Ingrid, Raúl, Román)
7. **ADR-017 Tier 2 Bridge Surface — Román, lunes 21-04** tras findings Raúl. Sin ADR firmado, no se escribe código de bridge. (Román, Raúl)
8. **Infra/CI gaps** (coverage, PR lint, npm audit) → backlog S2-infra-backlog, no Sprint Goal. (Helena)
9. **Track frontend — sync con Lucas lunes antes 10:00.** #23: refinar sin spec o desplazar a Sprint 3. (Román, Tomás)
10. **Bug `excerpt.raw` en OpenAPI** — ticket S2-W1, Carmen. (Ingrid)

---

## Conclusiones

**Decisiones tomadas:**

- Sprint Goal aprobado unánimemente
- ADR-013 → Accepted antes de EOD 18-04. Román firma.
- ADR bridge security boundary: Helena, deadline jueves 23-04, sin dependencia de ADR-015
- drizzle:generate + migrate con journal: prioridad absoluta Sprint 2 día 1
- ADRs 010/011/012 permanecen Proposed hasta que su implementación exista
- CF7 y cualquier plugin con network: requiere ADR + señal outreach, fuera de Sprint 2
- Outreach viernes 24-04: pregunta neutral, Eduardo + Alejandro redactan
- GC CircuitBreaker: ticket Sprint 2 semana 1, Raúl, code review Román

**Sin desacuerdos materiales.** Única tensión (010/011/012) resuelta con consenso inmediato.

---

## Acciones

| #   | Acción                                                                               | Responsable           | Plazo                   |
| --- | ------------------------------------------------------------------------------------ | --------------------- | ----------------------- |
| 1   | ADR-013 → Accepted (firma)                                                           | Román                 | Hoy EOD 18-04           |
| 2   | Estructurar backlog Sprint 2 en GitHub (Hardening, ADRs, Tier 2, Infra/CI, Frontend) | Tomás                 | Hoy tarde 18-04         |
| 3   | ADR bridge security boundary (write + Accepted)                                      | Helena                | Jueves 23-04            |
| 4   | ADR-015 Tooling runtime boundary (write)                                             | Román                 | Sprint 2 semana 1       |
| 5   | Brief Carmen: drizzle:generate + migrate + journal                                   | Ingrid                | Lunes 21-04             |
| 6   | ADR-017 Tier 2 Bridge Surface (write) tras findings Raúl                             | Román                 | Lunes 21-04             |
| 7   | GC stale entries CircuitBreaker (implementar, ticket S2-W1)                          | Raúl (review Román)   | Sprint 2 semana 1       |
| 8   | Bug excerpt.raw → corregir + OpenAPI (ticket S2-W1)                                  | Carmen (brief Ingrid) | Sprint 2 semana 1       |
| 9   | Sync con Lucas: #23 decision (refinar sin spec o Sprint 3)                           | Román                 | Lunes 21-04 antes 10:00 |
| 10  | CLA Assistant configuración                                                          | Alejandro + Eduardo   | Jueves 23-04            |
| 11  | Redactar pregunta neutra outreach (15 calls CTOs ICP-1)                              | Alejandro + Eduardo   | Antes viernes 24-04     |
| 12  | Temperature check equipo individual                                                  | Tomás                 | Lunes 21-04             |
| 13  | Ítems Infra/CI como S2-infra-backlog en GitHub                                       | Helena + Tomás        | Lunes 21-04             |
| 14  | Temperature check equipo midpoint Sprint 2                                           | Tomás                 | Miércoles 28-04         |

---

_Generado por /meet — Trinity_
