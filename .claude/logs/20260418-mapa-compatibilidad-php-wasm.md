# Reunión: Mapa de compatibilidad PHP-WASM + Node

**Fecha:** 2026-04-18 (noche)
**Participantes:** Tomás (Scrum Master), Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Raúl (Dev Backend), Helena (IT), Eduardo (Consultor)
**Duración estimada:** 60 minutos

---

## Preparación Individual

### Tomás (facilitador)

- Encuadre de entrada obligatorio: "¿qué tipo de artefacto es este mapa?" antes de planificar.
- Tres preguntas socráticas: inventario/roadmap/contrato, qué plugin rompe si NO implementamos, spike empírico.
- Riesgos: desmoralización post-Sprint 1 (92% done, ritmo x6), cierre técnico Román, presión scope Alejandro, escalada Eduardo.
- Inclinación personal: opción (B) — spike empírico con los 3 pilotos ICP-1.

### Alejandro (CEO)

- Reframe: mapa es arquitectura 24 meses, no backlog.
- D-008 innegociable: CMS nativo Node, NO orquestador WP. El mapa lo contradice.
- ICP-1/2/3 quieren **salir** de PHP, no mantenerlo.
- Postura: Tier 2 = subset mínimo que hace funcionar los 3 piloto. Mapa archivado como ADR informativo.
- Decisión: outreach 24-04 trae data en 3 semanas — revisión entonces, no antes.

### Román (Tech Lead)

- ADR-003 Tier 2 = "content logic only, no I/O/DB/networking". El mapa propone exactamente eso.
- Línea divisoria: Tier 2.0 (Options read-only + hooks + $\_SERVER mínimo) vs Tier 3 Full (12 🔴).
- Recomendación: opción (a) del user — subset mínimo + **ADR-017 "Tier 2 Bridge Surface"** congela el surface antes de Sprint 2.
- Riesgos: drift arquitectónico silencioso, scope creep encubierto, deuda cross-runtime exponencial, event loop bloqueado (cURL sync), $wpdb es el muro.

### Ingrid (Lead Backend)

- Options + Transients: trivial (1 día total), primera implementación.
- $wpdb: no lo resolvemos en Sprint 2, punto. Bloqueante estructural.
- Users/Auth: tenemos schema para `WP_User` fake. Cookies WP NO emulamos — contexto inyectado.
- Object Cache: Redis ya está, bridge 1 tarde.
- HTTP calls: cURL sync → necesita async wrapper (worker threads).
- El mapa tiene 12 🔴 y cero orden. Priorizar por plugin real.

### Raúl (Dev Backend)

- Validado empíricamente (día 1-3): 44 extensions, p95=2.4ms, hook bridge demostrado, memory stable.
- NO validado: $wpdb real, cookies/sessions, uploads, request lifecycle reset.
- El mapa mezcla 3 categorías conflictivas: resueltos, caros, prácticamente imposibles.
- Propuesta: spike day 4-6 con los 3 pilotos → matriz empírica de qué filas rompen realmente.
- Riesgo mayor: "marketing lee 44 extensions → vende full compat → plugin real falla".

### Helena (IT)

- Object Cache + Transients: Redis ya disponible, 1 día.
- Filesystem: opción A (FS virtual RO + S3/MinIO writes) — sin writes, 50% inviable queda bloqueado indefinido.
- HTTP calls: fetch proxy directo; cURL sync es el bloqueador de producción (async wrapper obligatorio).
- **Bloqueantes innegociables** antes de prod: ADR "bridge security boundary" (superficie ataque plugin malicioso) + observabilidad (cada bridge call = span).
- MinIO en docker-compose si aprobamos opción A.

### Eduardo (Consultor)

- Framework: Tier 1 Node nativo (95% valor) + Tier 2 content-only (5%, los 3 piloto) + Tier 3 NO.
- Benchmark: Ghost ($5M ARR), Strapi (61k stars), wp-now (Automattic interno). **Nadie comercial compite vía WP compat.**
- Anti-ICP: "Enterprise con 200 plugins PHP custom". El mapa optimiza para Anti-ICP.
- Pregunta: ¿algún outreach pidió Object Cache o es wishlist técnica?
- Riesgo: ser "Playwright-para-WP" commodity Automattic en lugar de alternativa.

---

## Conversación

**Tomás:** Buenas. Antes de abrir una sola fila del mapa, encuadro: 15 áreas con 12 🔴. La pregunta de esta reunión **no es cómo implementarlas** — es **qué tipo de artefacto es este mapa**. Inventario técnico, roadmap de producto o contrato con cliente. Una vez clasifiquemos, decidimos. Antes de eso: el equipo acaba de cerrar Sprint 1 al 92%, con demo 30-04 grabada esta tarde, tres redes de seguridad tras el post-mortem, y ADR-016 firmado. Lo celebro antes de meternos en el siguiente frente. Alejandro, empieza tú.

**Alejandro:** Gracias, Tomás. Voy directo. El mapa es arquitectura a 24 meses, no backlog. Si sale de aquí como "12 🔴 para Sprint 2", matamos el momentum del equipo y redirigimos la factory al Anti-ICP. Recordatorio — decisión D-008, firmada por mí, Eduardo y Román el 9 de abril: "NodePress es CMS nativo Node, NO orquestador WP." Este mapa, implementado entero, es literalmente el orquestador que rechazamos. Mi postura de entrada: archivar como ADR informativo, no entra en Sprint 2, re-evaluación solo con demanda validada y budget en la mesa.

**Eduardo:** Voy a empujarlo un escalón más. Alejandro quiere archivar — yo quiero que enmarquemos **por qué** lo archivamos, para que nadie del equipo lo saque del archivo en dos semanas con "es que sería útil". Benchmark rápido: Ghost cinco millones ARR, cero WP compat. Strapi sesenta y un mil stars, cero WP compat. wp-now y wordpress-playground: full compat WP en WASM, proyecto interno Automattic, nunca monetizado. Patrón claro — **ningún CMS comercial exitoso gana vía compat WP**. Los que lo hacen son Automattic internamente. Si construimos los 12 🔴, somos commodity dentro del ecosistema Automattic, no alternativa.

**Román:** De acuerdo con el archivado, pero matizo. El mapa no es todo-o-nada. Hay una línea que propongo dibujar hoy mismo, explícita. Tier 2.0: Options API en modo lectura, hooks cross-runtime, `$_SERVER` mínimo — **el subset que los tres pilotos de Raúl necesitan realmente**. Eso lo implementamos. Tier 3 Full: los otros doce 🔴 — `$wpdb`, Transients write, Uploads, Filesystem writes, Cookies WP, Sessions, HTTP calls síncronas. Reabre ADR-003 §Tier 3 y sus cuatro pre-requisitos no negociables. Eso queda fuera indefinidamente.

**Raúl:** Pausa antes de seguir. Estoy de acuerdo con la línea de Román pero el problema de fondo es que **estamos especulando**. Yo validé tres días del spike. Sé que hay cuarenta y cuatro extensions, sé que el hook bridge funciona, sé que la latencia warm es bajo un milisegundo. **NO sé** qué pasa con `$wpdb` real, con cookies, con sessions, con uploads, con el lifecycle reset entre requests. El mapa mezcla tres categorías: cosas resueltas trivialmente — un shim JS para `get_option` es medio día — cosas caras — Uploads con S3 requiere diseño — y cosas prácticamente imposibles — full `$wpdb` bridge a MySQL vivo. Tratar las quince filas como 🔴 homogéneo es planificación irresponsable.

**Ingrid:** Raúl tiene razón y añado concreción. Voy fila por fila con lo que sé de mi schema: Options es trivial, la tabla existe con índice por nombre, medio día. Transients es Options con `expires_at`, misma patrón. Users: el schema ya tiene `roles[]` y `capabilities JSONB` — podemos construir un `WP_User` fake inyectable, y las cookies WP con HMAC-pepper **no las emulamos** — le decimos al plugin "el contexto de usuario llega inyectado desde Node". Si un plugin valida cookies WP directamente en PHP, ese plugin no es viable en Tier 2, no es problema nuestro. Y `$wpdb` — el debate del 9 de abril lo cerramos: JSONB a EAV son semanas, mysqli presente en WASM no significa conectado, sin MySQL vivo es inviable.

**Helena:** Complemento desde infra. Object Cache y Transients comparten la misma solución — Redis ya está en docker-compose, wrapper JS de un día. Filesystem y Uploads son el bloqueador que importa: sin semántica de writes, el cincuenta por ciento de plugins inviables queda bloqueado indefinidamente. Propuesta concreta: FS virtual solo-lectura en WASM + S3-compatible para writes. En dev MinIO, en prod S3 real. Si lo aprobamos, añado MinIO a docker-compose el miércoles — dentro de la ventana del CI smoke-fresh-clone.

**Alejandro:** Para. Helena, lo que propones — MinIO, FS virtual RO, S3 prod — es trabajo real de Sprint 3+. No Sprint 2. Yo acepto que lo diseñemos a nivel ADR, pero **implementación solo cuando un cliente piloto lo pida**. ¿Estamos de acuerdo?

**Helena:** De acuerdo. Lo que pido es que si alguien empieza a implementar Filesystem sin mi ADR "bridge security boundary" firmado, lo paramos. No es negociable. Cada bridge Node↔PHP es superficie de ataque, un plugin malicioso via bridge puede acceder a variables de entorno Node. Observabilidad también: cada bridge call es un span, sin eso el debug en producción es imposible. Eso aplica desde el día uno de Tier 2.0 de Román — no solo para Tier 3 hipotético.

**Román:** Acepto los dos ADRs de Helena como gate. Bridge security + observabilidad. Van en Sprint 2 como parte del Tier 2.0 design, no como afterthought.

**Tomás:** Voy a reformular lo que veo. Tenemos coincidencia en:
(1) el mapa NO entra en Sprint 2 backlog;
(2) se archiva como catálogo informativo con un ADR que explique **por qué**;
(3) Tier 2.0 subset mínimo — lo que los tres pilotos ejercitan — sí entra en Sprint 2;
(4) Tier 3 Full se rechaza, reconsiderable solo con demanda validada + budget;
(5) dos ADRs gate de Helena: bridge security + observabilidad.
¿Qué falta? ¿Raúl?

**Raúl:** Falta lo que estoy pidiendo. Antes de comprometer Tier 2.0 a ciegas, déjenme hacer un spike day 4-6 con los tres pilotos — Footnotes, Shortcodes Ultimate, Display Posts — y producir una **matriz empírica**: qué filas del mapa toca cada plugin realmente. Hoy asumimos que los tres pilotos necesitan Options + hooks + `$_SERVER`, pero no lo he medido. Puede que toquen una cuarta cosa que rompe todo. Puede que una de las tres que Román propone sea innecesaria. Tres días más de spike me dan la respuesta. Sin ese dato, ADR-017 es especulación.

**Ingrid:** Suscribo. Implementar spec antes de demanda es lo contrario a lo que pedimos en la retro Sprint 0. R-3 — OpenAPI antes de delegar. Aquí el equivalente es matriz empírica antes de delegar Tier 2.0.

**Alejandro:** Vale. Pero pongo límite: tres días de spike, hard stop, verdict con la matriz. Raúl, ¿te cuadra?

**Raúl:** Sí. Hard stop lunes 22-04. Entrego matriz + verdict + recomendación de surface mínimo para Román escribir ADR-017.

**Tomás:** Y Helena empalma — el ADR security boundary lo necesitamos antes o en paralelo a Raúl. ¿Cómo lo haces?

**Helena:** En paralelo. Escribo el ADR esta semana, antes del jueves. No depende del dato empírico de Raúl — es principio de seguridad. Lo que el spike de Raúl me dice es qué APIs concretas tengo que modelar en el threat model.

**Eduardo:** Dos cosas antes de cerrar. Primera — quiero que el ADR de archivado del mapa incluya una línea explícita: **"reabrir solo si outreach ICP trae al menos tres señales independientes de plugins en el Anti-ICP"**. Sin ese umbral, en tres semanas alguien del equipo dirá "es que Object Cache no es tanto trabajo" y volvemos. Segunda — los quince outreach del viernes 24, que llevo yo con Alejandro, los oriento a preguntar **qué plugins usan hoy**, no qué plugins querrían. Eso convierte el mapa en hipótesis testable por el mercado, no por el equipo.

**Alejandro:** Acepto las dos. El ADR de archivado lo escribo yo — el mapa no es decisión técnica pura, es decisión de scope de producto. Román, ¿te parece que yo lo firme como CEO y tú co-sign?

**Román:** Correcto. Yo co-sign, pero quiero que la tabla de 15 áreas se **conserve literal** en el ADR. Como referencia, no como compromiso. El día que un cliente piloto pida Object Cache, abrimos la fila correspondiente y empezamos por ahí. El mapa no muere, se congela.

**Tomás:** Cierre entonces. Decisiones:

- **Mapa de 15 áreas:** archivado como ADR informativo (Alejandro + Román co-sign). Incluye tabla literal + criterio explícito de re-apertura (3 señales outreach plugins Anti-ICP).
- **Spike Raúl day 4-6:** hard stop lunes 22-04. Matriz empírica con los 3 pilotos. Output: qué filas del mapa toca cada uno.
- **ADR-017 "Tier 2 Bridge Surface":** Román escribe tras verdict Raúl. Freeze del subset empírico antes de Sprint 2 kickoff.
- **ADR security boundary:** Helena, esta semana, antes del jueves.
- **ADR observabilidad bridges:** Helena, misma ventana o Sprint 2 week 1.
- **Sprint 2 backlog Tier 2.0:** derivado del verdict Raúl + ADR-017. No antes.

¿Desacuerdos pendientes?

**Eduardo:** Ninguno por mi parte. Añado compromiso: los outreach del viernes incluyen pregunta explícita sobre plugins del Anti-ICP. Si la respuesta viene con tres señales independientes, reabrimos el mapa en Sprint 4 planning.

**Helena:** Sin desacuerdos. Escribo los dos ADRs esta semana.

**Ingrid:** Sin desacuerdos. Reservo mi semana 2 de Sprint 1 para soporte Raúl en el spike si lo necesita (queries reales contra el schema, no mocks).

**Raúl:** Hard stop lunes 22 entendido. Si el spike revela que los tres pilotos tocan más filas de las esperadas, aviso a Román el viernes 19 para pre-ajustar ADR-017.

**Román:** De acuerdo con todo. Reviso el ADR de archivado de Alejandro cuando lo tenga escrito.

**Alejandro:** Bien. Salimos.

---

## Puntos Importantes

1. **Mapa archivado, no backlog** — consenso total. Se conserva como catálogo informativo, NO entra en Sprint 2. (Alejandro + todos)
2. **D-008 reafirmado** — NodePress es CMS nativo Node, NO orquestador WP. El mapa implementado entero contradice esta decisión. (Alejandro)
3. **Tier 2.0 subset mínimo** — lo que los 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts) ejercitan realmente. Derivado empíricamente, no especulativamente. (Román)
4. **Tier 3 Full rechazado** — reconsiderable solo con demanda validada + budget + 3 señales outreach del Anti-ICP. (Eduardo + Alejandro)
5. **Spike Raúl day 4-6 antes de ADR-017** — matriz empírica con plugins reales antes de comprometer surface. Hard stop lunes 22-04. (Raúl + Ingrid + consenso)
6. **Bridge security boundary es gate** — ADR de Helena obligatorio antes de cualquier Tier 2.0 en prod. No negociable. (Helena)
7. **Observabilidad bridges no-afterthought** — cada bridge call es span tracerable desde día 1. (Helena)
8. **cURL sync bloquea event loop** — constraint real documentado. HTTP calls en Tier 2.0 requieren async wrapper obligatorio antes de prod. (Raúl + Ingrid + Helena convergen)
9. **Outreach viernes 24** pregunta explícita sobre plugins Anti-ICP. Respuesta con 3 señales independientes reabre el mapa en Sprint 4 planning. (Eduardo)
10. **Filesystem/Uploads Sprint 3+** — ADR posible, implementación solo cuando piloto lo pida. MinIO en compose si/cuando se aprueba. (Helena + Alejandro)

## Conclusiones

- Consenso total. Cero desacuerdos irreconciliables.
- El equipo entró con 7 perspectivas distintas y salió con 1 decisión clara y 5 deliverables concretos.
- Tomás protegió el framing ("catálogo vs backlog") y evitó que la reunión derivara a planning.
- Eduardo aportó el criterio de re-apertura (3 señales outreach) que cierra la puerta a scope creep silencioso en 3 semanas.
- El `$wpdb` queda definitivamente fuera de scope — no es debate técnico pendiente, es decisión de producto.

## Acciones

| #   | Acción                                                                                                                          | Responsable                            | Plazo                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------ |
| 1   | Spike day 4-6: matriz empírica con 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts) → qué filas del mapa toca cada uno | Raúl                                   | Hard stop lunes 2026-04-22           |
| 2   | ADR "PHP-WASM Compatibility Map — archived reference" con tabla literal + criterio de re-apertura                               | Alejandro + Román co-sign              | Viernes 2026-04-24                   |
| 3   | ADR-017 "Tier 2 Bridge Surface" — subset mínimo derivado del verdict Raúl                                                       | Román                                  | Tras verdict Raúl (martes 23-04)     |
| 4   | ADR "Bridge Security Boundary" — threat model Node↔PHP                                                                          | Helena                                 | Antes jueves 2026-04-23              |
| 5   | ADR "Bridge Observability" — cada bridge call = span tracerable                                                                 | Helena                                 | Sprint 2 week 1                      |
| 6   | Outreach privado incluye pregunta "¿qué plugins PHP usan hoy?" (no "cuáles querrían")                                           | Alejandro + Eduardo                    | Viernes 2026-04-24 arranque          |
| 7   | Pre-ajuste ADR-017 si spike revela filas extra tocadas por pilotos                                                              | Raúl → Román                           | Viernes 2026-04-19 si aplica         |
| 8   | Ingrid disponible para soporte Raúl en spike (queries reales contra schema)                                                     | Ingrid                                 | Week 2 Sprint 1                      |
| 9   | Reconsideración mapa (Sprint 4 planning) condicional: mínimo 3 señales outreach plugins Anti-ICP                                | Eduardo (registra), Alejandro (decide) | Sprint 4 planning (2026-05-15 aprox) |

---

_Generado por /meet — Trinity_
