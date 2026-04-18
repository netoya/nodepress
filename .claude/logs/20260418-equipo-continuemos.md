# Reunión: equipo continuemos — Sprint 1 semana 2

**Fecha:** 2026-04-18
**Participantes:** Tomás (Scrum Master), Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Lucas (Lead Frontend), Martín (Ops Manager), Eduardo (Consultor)
**Duración estimada:** 55 minutos

---

## Preparación Individual

### Alejandro (CEO)

- Demo 30-04 pasa de deadline a ceremonia. Grabación + outreach privado a 3-5 CTOs ICP-1.
- Scope semana 2: hardening + Sprint 2 prep. NO agresivo. Proteger momentum.
- Go-public: NO adelanto. CLA Assistant esta semana (R-5, suyo).
- R-9 Eduardo ping viernes 24-04. Pregunta: ¿qué ICP paga primero?
- Celebración explícita: el equipo lo ha hecho bien.

### Román (Tech Lead)

- Congelar alcance Sprint 1. Semana 2 = hardening selectivo + prep quirúrgica Sprint 2.
- Verdict Tier 2 mañana con criterios Go/No-Go claros.
- ADRs 005-009 a Accepted esta semana (sesión asíncrona miércoles).
- Deuda latente: `packages/cli`, `theme-engine`, `plugin-api` con `index.ts` de 1 línea. Escribir skeleton + ADR stub esta semana.
- Riesgo: complacencia. 92% done es narrativa peligrosa.

### Ingrid (Lead Backend)

- 108 tests verdes pero **0 contra Postgres real**. Handlers mockean DB. Hardening obligatorio.
- Propone 3 tickets semana 2: #28 integration tests Postgres real, #29 coverage db con INSERT/SELECT/UPDATE reales, #30 stress test circuit breaker concurrent.
- Posición: hardening antes que adelantar Sprint 2. Roles/capabilities sin integration tests = deuda cara.

### Lucas (Lead Frontend)

- Dashboard no es WP real. Sin /posts list + editor la demo es maqueta.
- Prioridad: `/posts` list (día 3-5) + editor básico (día 6-9) + dry-run demo (día 10).
- Faltan componentes: Input, Textarea, Select, Toast. Brief Marta sale hoy.
- Sofía no esperamos — el scaffold absorbe ajustes.
- Playwright trace para grabar demo end-to-end día 9-10.

### Martín (Ops)

- Velocity x6 baseline. NO sostenible — es arranque sin deuda heredada.
- Propuesta: scope freeze absoluto hasta 30-04. Cualquier ticket nuevo requiere Román + Tomás + él.
- Adelanto Sprint 2 selectivo a partir día 5, post-verdict spike. Candidatos low-risk: roles/caps schema, taxonomías.
- Riesgo idle: 3-4 roles sin scope en semana 2. Asignarles trabajo preparatorio.
- Burndown real publicado cada lunes.

### Tomás (Scrum Master)

- R-1, R-2, R-3, R-4, R-6 aplicadas. R-5, R-8 en pie. R-9 pendiente (viernes).
- R-2 (contract-freeze) aplicada pero no formalizada por escrito. Regresión posible semana 2.
- Spike #25 hard stop mañana — verificar criterio de "done" del verdict.
- Temperatura equipo: flow, pero NO asumir que flow = sostenible. Preguntar.

### Eduardo (Consultor)

- Velocity = regalo estratégico, NO técnico. Los 10 días son para validar mercado, no para adelantar código.
- Propuesta: 7 días discovery (15 calls CTOs ICP-1 con demo privada) + 3 días buffer técnico.
- Señales semana 14-18 abril: Strapi v5 (TS focus valida tesis), Automattic -16% (fatiga emocional mercado WP), ventana 12-18 meses.
- CLA Assistant = decisión de 2 horas, no de 2 semanas. Bloquea todo.
- Riesgo mayor: "construir bien lo que nadie quiere".

---

## Conversación

**Tomás:** Buenas, equipo. Estamos al cierre de día 2, con 92% de tickets done y demo 30-04 técnicamente implementada doce días antes. Román pidió esta sesión para decidir qué hacemos con los diez días que quedan. Antes de entrar en propuestas, mi pregunta inicial: ¿cómo estáis? El ritmo ha sido intenso.

**Lucas:** Yo bien — en flow. El dashboard salió limpio, Marta entregó impecable, Playwright visual funcionando. Hoy tengo energía para empujar /posts esta semana sin problema.

**Ingrid:** Igual. Sin fricción técnica. Pero quiero aprovechar para decir algo antes de que entremos en scope: 108 tests verdes no significa que el sistema funcione con una DB real. Los handlers mockean Postgres entero. Si alguien enchufa la demo del 30 contra una base de datos real y algo petardea, quedamos en evidencia.

**Alejandro:** Antes de entrar en lo técnico quiero decir algo y zanjarlo. El equipo ha entregado doce tickets en dos días, tooling crítico, y un spike con verdict preliminar viable. Eso no ocurre por casualidad — ocurre porque diseñasteis bien Sprint 0 y ejecutasteis bien Sprint 1. Lo digo y sigo. Ahora, la pregunta real: ¿cómo rentabilizamos esta ventana de diez días sin romper lo que funciona?

**Eduardo:** Os voy a hacer una pregunta incómoda, ¿puedo?

**Alejandro:** Dispara.

**Eduardo:** Habéis construido algo técnicamente impecable. ¿Alguien del mercado os ha dicho que lo quiere? El riesgo de estas ventanas no es que no las uséis — es que las uséis para construir más de lo mismo sin validar demanda. Strapi tardó 5 años en llegar a 61k stars. Nosotros llevamos 9 días con el repo privado. El coste de oportunidad de seguir construyendo en silencio se paga después, no ahora.

**Martín:** Eduardo tiene razón en el marco pero yo añado el dato operativo: tenemos 3-4 roles que en semana 2 entran en idle técnico si no hay scope nuevo. Sofía pendiente de wireframes, Nico sin tarea, Eduardo sin acción formal hasta el viernes. Yo ya te digo que tenemos capacity. La pregunta es qué metemos y qué NO metemos.

**Román:** A ver, yo lo veo distinto. Mi recomendación es congelar alcance de Sprint 1 como está y dedicar semana 2 a tres cosas: cerrar el refinement de #23 con wireframes de Sofía, pagar deuda técnica concreta que ya tenemos identificada, y preparar Sprint 2 con contracts firmados — pero NO abrirlo. Si abrimos tickets de roles o CLI por adelantado, metemos superficie nueva sin consolidar la actual. Eso es el error clásico.

**Ingrid:** Suscribo. Y añado concreción. Semana 2 propongo tres tickets backend: integration tests contra Postgres real — medio día porque docker-compose ya está operativo desde Sprint 0; coverage del paquete db con INSERT/SELECT/UPDATE reales, otro medio día; y stress test del circuit breaker de Raúl con 50 invocaciones concurrentes, un día. Total: dos días reales. No es adelantar Sprint 2, es hardening de lo que ya tenemos.

**Alejandro:** Me cuadra lo de Ingrid. Y lo que dice Román. Pero Eduardo me está pegando a un punto que no quiero soltar. Vamos a contrastarlo. Eduardo, cuando dices "siete días discovery", ¿eso es outreach público o privado?

**Eduardo:** Privado. Con la demo grabable que ya tenéis, podemos enseñarla bajo conversación a CTOs del ICP-1 sin exponer código. Quince calls en diez días, cero euros, pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" No vendemos — escuchamos. El output me vale más que cualquier ticket de Sprint 2.

**Alejandro:** Eso lo compro. Eduardo y yo nos vemos el jueves 23 para cerrar CLA Assistant en noventa minutos y arrancamos outreach privado el viernes. Ese trabajo ocurre en paralelo al equipo técnico. No es o lo uno o lo otro — es las dos cosas.

**Eduardo:** Mejor. Añado: hacedme caso con el CLA porque sin eso no podemos ni abrir la conversación privada bajo NDA ligero. Es una GitHub App gratuita y dos horas de lectura de términos. No hay excusa para arrastrarlo.

**Lucas:** Vale, pero volviendo a lo técnico — si no abrimos Sprint 2, yo tengo una preocupación. Para que la demo del 30 sea creíble como CMS, necesito /posts con lista y editor mínimo. Sin eso es una maqueta bonita. Y el editor no es scope trivial: Input, Textarea, Select, Toast, Modal. Lo que tengo de Marta cubre seis componentes atómicos pero falta toda la capa de forms.

**Tomás:** Lucas, ¿cuánto tiempo estimas?

**Lucas:** /posts list a día 3-5. Editor básico — textarea sin rich text, no bloques — día 6-9. Trace Playwright del flujo completo día 10. Seis-siete días de trabajo real. Marta puede arrancar los 4 componentes que faltan en paralelo si le paso brief hoy.

**Román:** Eso me parece bien, pero ojo: eso NO es "abrir Sprint 2". Eso es completar el scope que hace la demo de Sprint 1 demostrable. Y es justo el tipo de trabajo que no debería haber quedado fuera. Apunto: #23 dashboard + /posts list + /posts editor básico son el mismo bloque — "admin UI mínima para demo". Lo metemos como scope de Sprint 1, no como Sprint 2 adelantado.

**Martín:** Me parece razonable pero quiero que quede claro el protocolo. Si metemos /posts dentro de Sprint 1, que sea con aprobación explícita de los tres: Román, Tomás y yo. Sin excepción. El creep no se produce metiendo tickets nuevos — se produce metiendo tickets nuevos sin que nadie diga "stop" cuando empiezan a aparecer dependencias secundarias.

**Alejandro:** Protocolo aprobado. Lucas, /posts entra en Sprint 1 con los tres filtros que dice Martín. Pero te pongo un límite: sin rich text, sin bloques. Textarea. Estamos demostrando el plumbing, no WordPress 2026.

**Lucas:** Hecho. Textarea. Sin bloques. Brief para Marta con Input/Textarea/Select/Toast lo tengo antes de que termine la tarde.

**Román:** Yo añado el bloque técnico paralelo, que va a Ingrid y a mí. Tres cosas concretas: los tres paquetes vacíos — cli, theme-engine, plugin-api — que tienen `index.ts` de una línea cada uno. No los implemento, pero sí quiero un skeleton con interfaces y un ADR stub en cada uno para que Sprint 2 arranque sobre contratos y no sobre folios en blanco. Eso es medio día por paquete, día y medio total, mío.

**Ingrid:** Y yo cierro los tres tickets de hardening backend que dije. Paralelo al trabajo de Lucas. No nos bloqueamos entre sí.

**Tomás:** Una pregunta de facilitador antes de consolidar: ¿alguien ha sentido que el ritmo de los dos últimos días fue insostenible? Porque velocity x6 de baseline es un dato, pero el dato que no mido es cómo llega cada uno a semana 2.

**Lucas:** Yo no. Fue intenso pero salió fluido.

**Ingrid:** Tampoco. Me concentré, hice cosas que quería hacer bien, terminé satisfecha.

**Román:** Intenso. Fluido. Sin drama.

**Martín:** Yo desde ops tampoco vi señales. Pero coincido con Tomás en que no damos por supuesto que flow = sostenible. Apliquemos buffer mínimo 15% como siempre y vemos.

**Alejandro:** Lo que dice Tomás es correcto pero no lo extrapolaría. El equipo está bien. Si alguien hubiera estado mal, Tomás lo habría notado antes.

**Tomás:** Anotado. Lo pregunto cada pocos días en cualquier caso.

**Eduardo:** Una última cosa, Alejandro. El messaging. Tenéis dos líneas posibles para la landing: "CMS moderno. Sin legado." versus "WP-compatible. PHP-free." Con doscientos euros en ads podemos tener señal real antes del launch público. Prueba asíncrona, sin riesgo, con datos en cinco días. ¿Te interesa?

**Alejandro:** Me interesa, pero no esta semana. Lo apunto para la reunión de cierre de Sprint. Primero CLA, luego outreach privado, luego messaging test. Un frente abierto cada vez.

**Eduardo:** Disciplina. Ok.

**Tomás:** Recapitulo entonces. Scope Sprint 1 semana 2 acordado: (1) cerrar #23 con wireframes Sofía, (2) /posts list + editor básico — Lucas + Marta, (3) tres tickets hardening backend — Ingrid, (4) skeleton + ADR stub de cli/theme-engine/plugin-api — Román, (5) ADRs 005-009 a Accepted antes del viernes — Román. En paralelo, no-código: (6) Alejandro + Eduardo cierran CLA Assistant jueves, (7) outreach privado arranca viernes, (8) R-9 ping Eduardo viernes. ¿Falta algo?

**Ingrid:** R-2 formalización. Contract-freeze aplicado hoy pero no escrito como proceso. Que alguien lo redacte — puede ser un apéndice a contributing.md.

**Tomás:** Tomo ese. Lo escribo yo antes del lunes.

**Martín:** Y yo cierro el burndown real publicado cada lunes en GitHub Discussions, empezando el 21-04.

**Alejandro:** Cerrado. Salimos. Román, verdict del spike mañana a primera hora. Raúl tiene hard stop en el día 3.

**Román:** Ok. Mañana a las 10 os mando resumen del verdict con criterios Go/No-Go.

---

## Puntos Importantes

1. **NO abrimos Sprint 2 por adelantado** — consenso Román + Martín + Ingrid. Trade: disciplina > velocity aparente. (Román)
2. **/posts entra en Sprint 1 como completude del scope demo**, no como Sprint 2 adelantado — Input/Textarea/Select/Toast para Marta, editor textarea sin rich text. (Lucas + Alejandro)
3. **Hardening backend no-negociable:** 108 tests sin Postgres real es deuda invisible. 3 tickets de Ingrid semana 2. (Ingrid)
4. **Skeleton + ADR stub en los 3 paquetes vacíos** (cli, theme-engine, plugin-api) — prep Sprint 2 quirúrgica sin abrir scope. (Román)
5. **Protocolo scope freeze absoluto:** tickets nuevos en Sprint 1 requieren aprobación Román + Tomás + Martín. Sin excepción. (Martín)
6. **Outreach privado arranca viernes 2026-04-24** tras cierre CLA jueves. 15 calls CTOs ICP-1 con demo grabada en 10 días. Alejandro + Eduardo. (Eduardo + Alejandro)
7. **CLA Assistant es decisión de 2 horas, no de 2 semanas.** Jueves 23-04, 90 min, Alejandro + Eduardo. Bloquea outreach. (Eduardo)
8. **ADRs 005-009 a Accepted antes del viernes** — sesión asíncrona miércoles Román + sign-offs Ingrid/Helena. (Román)
9. **R-2 (contract-freeze) formalizada como proceso escrito** en apéndice a contributing.md. Tomás antes del lunes. (Ingrid + Tomás)
10. **Burndown real publicado cada lunes** en GitHub Discussions desde 21-04. Buffer mínimo 15% mantenido. (Martín)
11. **Temperature check equipo: flow, sin señales burnout** — pero no se asume sostenibilidad por defecto. Tomás sondea cada pocos días. (Tomás)
12. **Messaging A/B test parqueado** a cierre Sprint — un frente abierto cada vez. (Alejandro cierra sugerencia Eduardo)

## Conclusiones

- Consenso total en congelar alcance Sprint 1 + hardening selectivo + prep quirúrgica Sprint 2.
- /posts se admite como completude del scope demo, con filtros explícitos (textarea, sin bloques).
- Outreach privado + CLA avanzan en paralelo al trabajo técnico — no compiten por capacidad.
- Verdict Tier 2 mañana (día 3) mantiene el hard stop acordado en kickoff.
- Un desacuerdo desescalado: Eduardo quiso empujar messaging A/B ya, Alejandro lo aparcó a cierre Sprint. Sin rencor. Disciplina de un frente abierto cada vez.

## Acciones

| #   | Acción                                                                         | Responsable         | Plazo                         |
| --- | ------------------------------------------------------------------------------ | ------------------- | ----------------------------- |
| 1   | Verdict Tier 2 post-spike day 3 con criterios Go/No-Go                         | Raúl + Román        | 2026-04-19 10:00              |
| 2   | ADRs 005-009 a Accepted (sesión async miércoles)                               | Román               | Viernes 2026-04-24            |
| 3   | Skeleton + ADR stub: `packages/cli`, `theme-engine`, `plugin-api`              | Román               | Viernes 2026-04-24            |
| 4   | #28 Integration tests REST + Postgres real (docker-compose)                    | Ingrid              | Martes 2026-04-22             |
| 5   | #29 Coverage db real (INSERT/SELECT/UPDATE)                                    | Ingrid              | Miércoles 2026-04-23          |
| 6   | #30 Stress test circuit breaker — 50 concurrent hooks                          | Ingrid + Raúl       | Viernes 2026-04-24            |
| 7   | Brief Marta: Input, Textarea, Select, Toast (design system nivel 2)            | Lucas               | Hoy EOD (2026-04-18)          |
| 8   | /posts list page                                                               | Lucas               | Lunes-miércoles sem 2         |
| 9   | /posts editor básico (textarea, sin bloques)                                   | Lucas               | Jueves-lunes sem 2            |
| 10  | Playwright trace end-to-end demo grabada                                       | Lucas               | Martes 2026-04-28             |
| 11  | #23 dashboard refinement con wireframes Sofía                                  | Lucas               | Post wireframes Sofía         |
| 12  | CLA Assistant configurado + firma                                              | Alejandro + Eduardo | Jueves 2026-04-23             |
| 13  | Outreach privado — 15 calls CTOs ICP-1 con demo grabada                        | Alejandro + Eduardo | 24-04 → 03-05                 |
| 14  | R-9 Ping Eduardo sobre señales mercado (pregunta: ¿qué ICP paga primero?)      | Alejandro           | Viernes 2026-04-24            |
| 15  | Formalizar R-2 contract-freeze como apéndice a `docs/contributing.md`          | Tomás               | Lunes 2026-04-21              |
| 16  | Burndown real semanal en GitHub Discussions                                    | Martín              | Lunes 2026-04-21 (recurrente) |
| 17  | Protocolo scope freeze: cualquier ticket nuevo requiere Román + Tomás + Martín | Martín (enforcer)   | Activo desde hoy              |
| 18  | Temperature check equipo cada 3-4 días                                         | Tomás               | Continuo                      |
| 19  | Messaging A/B test (parqueado a cierre Sprint)                                 | Eduardo             | Tras 30-04                    |

---

_Generado por /meet — Trinity_
