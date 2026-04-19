# Sprint 7 — Backlog Draft

**Fecha:** 2026-04-19
**Generado por:** Martín (Ops Manager) — post retro S6 + roadmap review
**Referencia:** R-S6-4 (Plugin marketplace UI como P0 Sprint 7), velocity baseline S6=10 / S5=11 / S4=8
**Ventana Sprint 7:** 2026-06-30 → 2026-07-11

---

## Contexto Post-Retro S6

Sprint 6 cerró 10/10 — sprint más completo desde Sprint 2. La paralelización agresiva de agentes y el ADR-023 como contrato previo al código fueron los factores clave. Sprint 7 replica ese patrón.

### Señales que marcan el backlog

**Del ICP-1 debrief (S6):**

- H-1 confirmada: plugins de terceros son bloqueante universal (5/5 calls). El registry CLI opera — falta la capa de descubrimiento visual.
- H-3: CLI es el canal de confianza técnico. No abandonar CLI en favor de UI — extender, no sustituir.

**De la retro S6:**

- R-S6-4 (P0 Sprint 7): Plugin marketplace UI — Lucas + Nico. Capa natural sobre el registry CLI entregado en S6.
- I-1: Logs de ceremonias son gate de cierre desde S7. Sin kickoff log = sprint no cerrado.
- I-2: GitHub Issues #74-#83 sin mapear — Martín los crea esta semana antes del kickoff.
- I-4: CLA bloqueado 4 sprints — Alejandro confirma Org Admin access antes del 2026-04-26 o se escala como D-039.

### ADR pendiente de cierre antes del kickoff

**ADR-024 Plugin Marketplace Architecture** — Román debe tenerlo en estado Accepted antes del día 1. Mismo patrón que ADR-023 en S6. Sin ADR-024 aceptado, Lucas y Nico no arrancan el UI.

---

## Backlog Propuesto Sprint 7

**Techo:** 10 tickets. **Velocity baseline:** S6=10, S5=11, S4=8. Cap conservador 10 con 15% buffer aplicado.
**Feature freeze:** 2026-07-09 12:00 (inamovible — 2 días QA antes del cierre 11-07).
**Kickoff:** 2026-06-30 AM (tras retro S6 cerrada — D-037).

| #   | Título                                                                       | Responsable                           | Prioridad | Puntos |
| --- | ---------------------------------------------------------------------------- | ------------------------------------- | --------- | ------ |
| 84  | Plugin marketplace UI — browse + install desde admin panel                   | Lucas + Nico                          | P0        | 5      |
| 85  | Plugin dependency resolution — instalar dependencias declaradas en manifest  | Raúl + Ingrid                         | P0        | 3      |
| 86  | ADR-024 Plugin Marketplace Architecture                                      | Román                                 | P0        | 1      |
| 87  | Verified publishers badge — criterios + badge UI                             | Alejandro (criterios) / Román + Lucas | P1        | 3      |
| 88  | `nodepress plugin uninstall <slug>` — CLI + REST DELETE /wp/v2/plugins/:slug | Raúl                                  | P1        | 2      |
| 89  | Plugin search `GET /wp/v2/plugins?q=...` — full-text name + description      | Carmen + Ingrid                       | P1        | 2      |
| 90  | CLA webhook operativo — si Alejandro confirma Org Admin antes del kickoff    | Helena                                | P1        | 1      |
| 91  | Dark mode admin panel                                                        | Marta + Nico                          | P2        | 3      |
| 92  | Plugin ratings schema stub — groundwork para comunidad                       | Ingrid                                | P2        | 2      |
| 93  | Tier 2 bridge — shortcode nesting depth limit configurable                   | Raúl                                  | P2        | 2      |

**Total puntos:** 24. **Cap con 15% buffer:** ~20 puntos efectivos. Tickets P2 entran solo si P0+P1 cierra antes del feature freeze.

---

## Notas de Priorización

### P0 — Inamovibles

**#84 Plugin marketplace UI (Lucas + Nico)**
Mandato directo de R-S6-4. El registry CLI está operativo desde S6; la ausencia de UI de descubrimiento es el gap de adopción más visible para el ICP no-técnico. Nico se activa aquí como refuerzo frontal. Lucas lidera; Nico ejecuta prototipado e interacciones. ADR-024 debe estar Accepted antes del kickoff — sin él, este ticket no arranca.

**#85 Plugin dependency resolution (Raúl + Ingrid)**
Un plugin que declara dependencias sin mecanismo de resolución automática es un riesgo operativo. El ICP técnico espera que `nodepress plugin install` resuelva el árbol de dependencias. Sin esto, el marketplace UI no tiene valor real — instalar un plugin roto silenciosamente destruye la confianza.

**#86 ADR-024 Plugin Marketplace Architecture (Román)**
Mismo patrón que ADR-023 en Sprint 6: el ADR es el contrato de coordinación, no las llamadas. Lucas, Nico, Raúl e Ingrid no pueden ejecutar #84 y #85 en paralelo sin este contrato. Puntos: 1 — debe estar listo el día 1 del sprint.

### P1

**#87 Verified publishers badge (Alejandro + Román + Lucas)**
Diferenciador de confianza para el marketplace. Alejandro define los criterios (negocio); Román + Lucas implementan la lógica. La implementación solo arranca si Alejandro entrega los criterios en los primeros 2 días del sprint.

**#88 `nodepress plugin uninstall <slug>` (Raúl)**
Ciclo de vida completo del plugin: install existe desde S6, uninstall es su complemento natural. REST DELETE /wp/v2/plugins/:slug complementa el CLI.

**#89 Plugin search full-text (Carmen + Ingrid)**
El marketplace UI sin búsqueda es un catálogo estático. La búsqueda sobre name + description es el mínimo viable para que el ICP técnico encuentre plugins. Carmen implementa el endpoint REST; Ingrid extiende el schema DB con índice full-text.

**#90 CLA webhook operativo (Helena)**
Si Alejandro confirma Org Admin access antes del kickoff S7, Helena lo opera en los primeros 2 días. Si no hay confirmación el 2026-06-30 AM, el ticket se descarta y se escala formalmente como D-039.

### P2 — Capacidad si P0+P1 cierra antes del freeze

**#91 Dark mode admin panel (Marta + Nico):** Deuda de roadmap desde Sprint 0.

**#92 Plugin ratings schema stub (Ingrid):** Groundwork para la capa de comunidad en Sprint 8+.

**#93 Tier 2 bridge — nesting depth configurable (Raúl):** NODEPRESS_SHORTCODE_MAX_DEPTH — la guard hardcodeada a 10 (R-S5-2) se hace configurable.

---

## Decisiones Pendientes de Alejandro

| #   | Decisión                                                       | Deadline       | Consecuencia si no hay respuesta                     |
| --- | -------------------------------------------------------------- | -------------- | ---------------------------------------------------- |
| 1   | Confirmar Org Admin access para CLA Assistant (R-S6-2)         | 2026-04-26     | Escalar como D-039. #90 descartado de Sprint 7.      |
| 2   | Criterios de verificación para Verified Publishers badge (#87) | 2026-07-02 EOD | #87 descartado — no implementar badge sin criterios. |
| 3   | Scope marketplace UI: browse+install, ¿o también ratings stub? | 2026-06-30 AM  | Default: browse+install solo. #92 entra como P2.     |

---

## Riesgos

| ID    | Riesgo                                                    | Probabilidad | Impacto | Mitigación                                                                       |
| ----- | --------------------------------------------------------- | ------------ | ------- | -------------------------------------------------------------------------------- |
| RS7-1 | ADR-024 no listo el día 1 — #84 y #85 bloqueados          | Baja         | Alto    | Román confirma ADR-024 draft en retro S6 (2026-04-21 AM).                        |
| RS7-2 | Criterios verified publishers sin respuesta de Alejandro  | Media        | Medio   | #87 se descarta automáticamente día 2.                                           |
| RS7-3 | CLA sin confirmación — deuda legal se extiende a Sprint 8 | Alta         | Medio   | Helena tiene implementación lista. El riesgo es político, no técnico.            |
| RS7-4 | #84 + #85 en paralelo producen colisiones de interfaz     | Media        | Alto    | ADR-024 define la surface API que ambos consumen. Con ADR Accepted, riesgo bajo. |

---

## Staffing

| Persona   | Tickets asignados | Carga estimada        |
| --------- | ----------------- | --------------------- |
| Lucas     | #84, #87 (impl)   | Alta — P0 + P1        |
| Nico      | #84, #91          | Media — P0 + P2       |
| Raúl      | #85, #88, #93     | Alta — P0 + P1 + P2   |
| Ingrid    | #85, #89, #92     | Alta — P0 + P1 + P2   |
| Román     | #86, #87 (impl)   | Media — P0 + P1       |
| Carmen    | #89               | Baja — P1             |
| Helena    | #90               | Baja — P1 condicional |
| Marta     | #91               | Baja — P2             |
| Alejandro | Criterios #87     | Consulta — días 1-2   |

**Nota Tomás:** Kickoff log fechado el 2026-06-30 es obligatorio (I-1 retro S6). Sin log de kickoff, el sprint no se considera abierto formalmente.

---

_Documento producido por Martín (Ops Manager), 2026-04-19._
_Próxima revisión: kickoff Sprint 7 — 2026-06-30 AM._
