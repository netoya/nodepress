# Reunión: Kickoff Sprint 6

**Fecha:** 2026-04-19 (retroactiva — sprint arranca 2026-06-16)
**Participantes:** Alejandro (CEO), Tomás (Scrum Master), Martín (Ops Manager), Román (Tech Lead), Ingrid (Lead Backend), Lucas (Lead Frontend)
**Duración estimada:** 45 min

---

## Objetivo Sprint 6

"NodePress extensible desde el marketplace: plugin registry operativo, CLI install funcional, vm.Context con límite de memoria, OpenAPI completo."

## Techo y capacity

- **Techo:** 10 tickets. Velocity baseline: Sprint 5 = 11 tickets.
- **Feature freeze:** 2026-06-25 12:00 (inamovible)
- **Cierre Sprint 6:** 2026-06-27
- **Nico:** activado desde día 1 (D-038 cumplida — 5/5 ICP-1 calls confirman plugins terceros)

## Priorización

- **P0 (inamovibles):** #74 Plugin Registry schema + API, #75 nodepress plugin install CLI, #76 REST /wp/v2/plugins, #77 ADR-023 → Accepted
- **P1:** #78 vm.Context Worker Threads hardening, #79 OpenAPI 100%, #80 CLA webhook
- **P2 (si hay capacity):** #81 Users UI, #82 Media uploads stub, #83 cURL sync bridge

## Decisiones del kickoff

| ID    | Decisión                                                                          | Responsable  |
| ----- | --------------------------------------------------------------------------------- | ------------ |
| D-039 | Plugin Registry: tarball local filesystem en S6. S3/MinIO evaluación S7+          | Ingrid       |
| D-040 | NODEPRESS_WORKER_SANDBOX=true activa Worker Threads (default OFF, ADR-014 safe)   | Raúl + Román |
| D-041 | README se actualiza a "Beta abierta a contribuidores técnicos" — framing acordado | Román        |
| D-042 | Logs de ceremonias pasan a ser gate de cierre de sprint desde S7                  | Tomás        |

## Retro Sprint 5 cerrada

Retro Sprint 5 cerrada async 2026-04-21 AM. Actas en `docs/process/retros/sprint-5-retro.md`.
Condición D-037 cumplida. Sprint 6 arranca con retro anterior cerrada.

---

_Acta retroactiva generada 2026-04-19. Datos de PROJECT_STATUS.md y backlog-sprint6-draft.md._
_Generado por /meet — Trinity_
