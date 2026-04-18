# Reunión: Kickoff Sprint 4 — Plugin System + Theme Engine + Post-Launch

**Fecha:** 2026-05-19
**Participantes:** Alejandro (CEO), Román (Tech Lead), Ingrid (Lead Backend), Tomás (Scrum Master), Martín (Ops Manager)
**Tipo:** Kickoff asíncrono

---

## Context Cargado

- Sprint 3 cerrado: 11/12 tickets, 368 tests, ADR-020 Accepted, repo público 14-05
- Outreach ICP-1: 15 calls 24-04→02-05 completadas. Signal pendiente de integrar en backlog.
- CI fixes: TypeScript errors resueltos, smoke-fresh-clone arreglado (build core package)

## Sprint Goal

"NodePress extensible: primer plugin JS/TS real con vm.Context sandbox, ThemeEngine MVP, gestión post-lanzamiento de issues externos y primera iteración basada en feedback ICP-1."

## Tickets P0 (bloqueantes para demo Sprint 4)

- #56 vm.Context sandbox plugins (ADR-004) — Raúl + Román
- #57 Plugin demo "Hello World" (JS/TS, loadPlugins) — Raúl
- #58 ThemeEngine interface MVP (ADR-021) — Román + Lucas

## Tickets P1

- #59 Primer template theme (single post + archive) — Lucas + Marta
- #60 Backlog adjustment post-ICP-1 signal — Alejandro + Martín
- #61 Issues externos triage + CLA checks — Martín + Helena
- #62 Plugin API docs — Román

## Tickets P2

- #63 WP Import CLI básico — Carmen
- #64 GET /wp/v2/users readonly — Ingrid + Carmen
- #65 Dashboard #23 visual refinement — Lucas + Marta

## Decisiones

1. P0 sin todas 3 = sprint no cumple objetivo. Freeze si van mal.
2. 10 tickets máx + 2 buffer. Velocity Sprint 3 = 11/12 como baseline.
3. Feature freeze: 28-05 12:00.
4. Retro Sprint 3: cerrar 19-05 AM, consolidar antes del planning.
5. Issues externos: triage <48h. CLA obligatorio desde primer PR externo.
6. ADR-021 ThemeEngine entra como implementación real (quedó Proposed en Sprint 3).

## Acciones

| #   | Acción                                    | Responsable        | Plazo            |
| --- | ----------------------------------------- | ------------------ | ---------------- |
| 1   | vm.Context sandbox (ADR-004) impl + tests | Raúl + Román       | Sprint 4 día 1-3 |
| 2   | Plugin demo Hello World                   | Raúl               | Sprint 4 día 4   |
| 3   | ADR-021 → Accepted + ThemeEngine MVP      | Román + Lucas      | Sprint 4 día 1-4 |
| 4   | Backlog adjustment post-ICP-1             | Alejandro + Martín | 19-05 PM         |
| 5   | GitHub Issues #56-#65 con P0/P1/P2        | Martín             | 20-05            |
| 6   | Retro Sprint 3 async consolidada          | Tomás              | 19-05 AM         |
| 7   | Issues externos triage process            | Helena + Martín    | 19-05            |

---

_Generado por /meet async — Trinity_
