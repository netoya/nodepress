# Sprint 6 — Backlog Draft

**Fecha:** 2026-06-14
**Generado por:** Martín (Ops Manager) — post ICP-1 debrief
**Referencia:** Decisión D-033 (Plugin marketplace S5 = signal only. Infra S6+ condicionada a ICP-1)
**Ventana Sprint 6:** 2026-06-16 → 2026-06-27

---

## ICP-1 Debrief

### Contexto del outreach

- **Ventana:** 2026-04-24 → 2026-05-02 (10 días laborables)
- **Calls realizadas:** 5 (objetivo mínimo alcanzado)
- **Perfil entrevistados:** CTOs / Tech Leads de agencias digitales y equipos de producto con WordPress como CMS principal
- **Facilitó:** Eduardo (Consultor) + Alejandro (CEO)

### Hallazgos clave

**H-1 — Plugins de terceros: bloqueante universal (5/5 calls)**
Todas las calls mencionaron la dependencia de plugins JS/TS de terceros como barrera de adopción. La pregunta "¿qué es innegociable?" convergió en el mismo punto: SEO (tipo Yoast), formularios (tipo Gravity/Contact Form 7), y caché/performance. Sin un mecanismo de instalación y gestión de plugins desde un registry, la migración no es viable para ninguno de los perfiles entrevistados.

Cita representativa: _"Si no puedo instalar el plugin de SEO que ya usa mi equipo, tengo que reescribir la integración de cero — y nadie va a aprobar eso internamente."_

**H-2 — WP Import es condición necesaria, no diferenciadora**
4/5 calls confirmaron que la herramienta de importación desde WordPress es un prerequisito de entrada. Sin import funcional no hay conversación de piloto. El import-wp CLI de Sprint 5 cubre esta base; ningún entrevistado pidió más funcionalidad de import en esta fase.

**H-3 — CLI es el canal de confianza del ICP técnico**
3/5 calls señalaron la CLI como el punto de entrada preferido para evaluar un CMS nuevo. Comentarios sobre `nodepress plugin install` y `nodepress plugin list` aparecieron en conversaciones donde no se había mencionado explícitamente. El ICP técnico confía en CLI antes que en una UI de marketplace.

**H-4 — Plugin registry básico, no marketplace completo**
Ningún entrevistado pidió un marketplace con UI visual en esta fase. El umbral mínimo aceptable es: (a) un registry donde registrar un plugin con metadata, (b) `nodepress plugin install <name>`, (c) documentación de cómo publicar un plugin. La UI del marketplace es Sprint 7+.

**H-5 — vm.Context hardening es bloqueante de confianza empresarial**
2/5 calls (los más técnicos) preguntaron específicamente por sandboxing de plugins. La respuesta "usamos vm.Context pero sin límite de memoria explícito" generó fricción. Para adopción en agencias con clientes empresariales, el aislamiento de plugins debe ser auditable y documentado.

### Decisión resultante

ICP-1 confirmado (5/5 calls mencionan plugins de terceros). Activar infra marketplace en Sprint 6 según D-033. Nico se activa en Sprint 6 según D-038.

---

## Backlog Propuesto Sprint 6

**Techo:** 10 tickets. **Velocity baseline:** Sprint 5 ~8 completados. Cap conservador con 15% buffer.
**Feature freeze:** 2026-06-25 12:00. **Cierre Sprint 6:** 2026-06-27.

| #   | Título                                                           | Responsable           | Prioridad | Puntos |
| --- | ---------------------------------------------------------------- | --------------------- | --------- | ------ |
| 74  | Plugin Registry — schema DB + API básica (register, list, get)   | Ingrid                | P0        | 3      |
| 75  | `nodepress plugin install <name>` — CLI command + registry fetch | Raúl                  | P0        | 3      |
| 76  | Plugin Registry REST endpoints (GET /wp/v2/plugins, POST)        | Carmen (brief Ingrid) | P0        | 2      |
| 77  | ADR-023 Plugin Registry Architecture                             | Román                 | P0        | 1      |
| 78  | vm.Context hardening — memory limit + resource quota             | Raúl + Román          | P1        | 3      |
| 79  | OpenAPI completo — endpoints cubiertos al 100%                   | Carmen                | P1        | 2      |
| 80  | CLA webhook operativo + outreach confirmation                    | Helena + Martín       | P1        | 1      |
| 81  | Users management UI — list + role editor admin panel             | Lucas + Nico          | P2        | 3      |
| 82  | Media uploads stub — POST /wp/v2/media + storage local           | Ingrid + Carmen       | P2        | 2      |
| 83  | Tier 2 bridge — cURL sync (deuda D-020, Sprint 2)                | Raúl                  | P2        | 2      |

**Total puntos:** 22. **Cap con 15% buffer aplicado:** ~19 puntos efectivos. Tickets P2 entran si P0+P1 se cierra antes del freeze.

### Notas de priorización

- **P0:** Los tickets 74-77 conforman el MVP de marketplace. Sin ellos Sprint 6 no cumple el mandato de ICP-1. No son negociables.
- **P1:** #78 vm.Context hardening es bloqueante de confianza (H-5). #79 OpenAPI es deuda recurrente que bloquea integraciones externas. #80 CLA webhook es deuda de cuatro sprints — se cierra aquí o se convierte en riesgo legal.
- **P2:** #81 Nico se activa en Sprint 6 (D-038 cumplido). #82 y #83 son deuda de roadmap que entra solo si el sprint tiene capacidad.

---

## Asignación Buffer #72 y #73 (Sprint 5)

| Ticket | Propuesta                                              | Justificación                                                                                   |
| ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| #72    | ADR-023 Plugin Registry Architecture (stub / borrador) | Román puede avanzar el ADR esta semana como pre-trabajo de Sprint 6. Reduce riesgo de arranque. |
| #73    | vm.Context memory limit — spike 1 día (Raúl)           | Spike acotado para evaluar approach antes del Sprint 6 kickoff. Hard stop EOD 2026-06-13.       |

Si no hay capacity en Sprint 5, los tickets #72 y #73 se descartan y el trabajo entra directamente en Sprint 6.

**Decisión final:** Martín + Alejandro + Tomás en planning Sprint 6 kickoff (2026-06-16 AM).

---

## Decisiones pendientes de Alejandro

| #   | Decisión                                                                                         | Deadline      |
| --- | ------------------------------------------------------------------------------------------------ | ------------- |
| 1   | Activar a Nico formalmente en Sprint 6 (D-038 condición cumplida)                                | 2026-06-16 AM |
| 2   | Confirmar scope del registry: solo install/list, o también plugin publish en Sprint 6            | 2026-06-16 AM |
| 3   | Capacidad de #82 media uploads: si entra, define límite de almacenamiento local (no cloud en S6) | 2026-06-16 AM |
| 4   | CLA webhook (#80): si no está cerrado en S5 (#61), entra como P0 en S6, no P1                    | Automático    |

---

_Documento producido por Martín (Ops Manager), 2026-06-14._
_Próxima revisión: kickoff Sprint 6 — 2026-06-16 AM._
