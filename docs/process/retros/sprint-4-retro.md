# Retro Sprint 4 — Async (2026-05-19 → 2026-05-30)

> Retro **abierta 2026-04-18** (kickoff Sprint 5). Cierre: **lunes 2026-04-20 AM**.
> Acciones consolidadas por Tomás tras cierre.
>
> Participantes invitados: Alejandro, Román, Ingrid, Lucas, Carmen, Raúl, Marta, Helena, Martín, Eduardo.
> Tomás facilita — no puntúa, sintetiza.

---

## Cómo contribuir

Añade tu respuesta directamente en este archivo (PR o commit a main) o en el hilo de GitHub Discussions "Retro Sprint 4".
**Deadline: lunes 2026-04-20 AM.** Tomás consolida el lunes y cierra el documento.

Tres preguntas, responde las que puedas:

1. ¿Qué salió bien?
2. ¿Qué mejorar / qué nos frenó?
3. ¿Qué probamos en Sprint 5?

---

## Sprint Goal Sprint 4

> "NodePress extensible: primer plugin JS/TS real con vm.Context sandbox, ThemeEngine MVP, gestión post-lanzamiento de issues externos y primera iteración basada en feedback ICP-1."

**¿Se cumplió?** Parcialmente. Los tres P0 técnicos se entregaron (vm.Context sandbox, Plugin Hello World, ThemeEngine MVP). 8 de 10 tickets completados. Los tickets #60 (debrief ICP-1 signal) y #61 (CLA + triage issues externos) se difieren a Sprint 5 como P0.

---

## 1. ¿Qué salió bien?

**[Espacio para respuestas del equipo — deadline 2026-04-20 AM]**

---

### Observaciones iniciales de Tomás (facilitador)

**Plugin system real (vm.Context sandbox).**
`runInSandbox()` con timeout guard + `loadPlugins()` + Hello World plugin demo funcionando end-to-end. El contrato de ADR-004 se implementó limpio. Raúl y Román entregaron exactamente lo que prometieron en el kickoff.

**ThemeEngine MVP (ADR-021 cerrado).**
El ADR-021 llevaba pendiente desde Sprint 3 (ticket #53 marcado 🔵 S4). En Sprint 4 pasó a Accepted e implementado con InlineThemeEngine, templates single/archive y handlers wired. La deuda técnica de Sprint 3 se saldó sin afectar a los P0 nuevos.

**CI fixes que mantuvieron la cadena verde.**
Dos fixes de CI (theme-engine tsconfig reference + smoke build steps) se resolvieron en horas sin bloquear el sprint. La disciplina de "CI en rojo = stop the line" está interiorizada.

**WP Import CLI stub (#63) y Plugin API docs (#62).**
Tickets no originalmente en los P0 que entraron en la segunda mitad del sprint y se cerraron. El import-wp stub posiciona Sprint 5 para construir la importación real sobre base existente.

---

## 2. ¿Qué mejorar?

**[Espacio para respuestas del equipo — deadline 2026-04-20 AM]**

---

### Observaciones iniciales de Tomás (facilitador)

**#60 y #61 deferidos — tickets condicionados a eventos externos.**
Backlog adjustment post-ICP-1 (#60) y CLA + triage de issues externos (#61) entraron en Sprint 4 planning sabiendo que dependían de señales externas (outreach + lanzamiento). Eran tickets condicionales, no de ejecución. La lección: los tickets condicionados a eventos externos no entran en el sprint hasta que la condición es verdadera. Proceso fijado a partir de Sprint 5 (D-034).

**PROJECT_STATUS vs ADRs desincronizados.**
Al arrancar el kickoff Sprint 5 se detectó que ADR-020 y ADR-021 figuraban como Proposed en PROJECT_STATUS cuando ya eran Accepted desde Sprint 3 y Sprint 4 respectivamente. Proceso corregido: ADR aceptado → actualización PROJECT_STATUS en el mismo PR (D-035).

**CLA no confirmado — deuda de cuatro sprints.**
La CLA Assistant no quedó configurada pese a haber sido señalada como gate desde Sprint 0. Entra como #61 P0 Sprint 5. No puede seguir siendo el último item de la lista.

---

## 3. ¿Qué probamos en Sprint 5?

**[Espacio para respuestas del equipo — deadline 2026-04-20 AM]**

---

### Dirección acordada en kickoff Sprint 5 (2026-04-18)

Sprint Goal Sprint 5: **"NodePress adoptable: CLI funcional, importación WP real, repo abierto a contribuidores con CLA y licencia definida."**

P0 ordering acordado:

1. #60 — Debrief ICP-1 signal + backlog adjustment (días 1-2)
2. #61 — CLA Assistant + triage issues externos
3. WP Import CLI real (sobre el stub #63)
4. Plugin list command CLI
5. React Router migración

Techo: 10 tickets (8 nuevos + #60 + #61 heredados).

---

## Acciones (consolidadas post-retro)

> Tomás (Scrum Master) — consolidadas tras cierre lunes 2026-04-20.

| #      | Acción                                                                               | Responsable                          | Deadline         | Fuente               |
| ------ | ------------------------------------------------------------------------------------ | ------------------------------------ | ---------------- | -------------------- |
| R-S4-1 | #60 y #61 como P0 inamovibles Sprint 5 — entran días 1-2                             | Alejandro + Martín / Martín + Helena | Sprint 5 día 2   | Kickoff S5           |
| R-S4-2 | Tickets condicionados a eventos externos: no entran hasta que la condición se cumple | Tomás (proceso)                      | A partir de hoy  | Retro S4             |
| R-S4-3 | ADR aceptado → PR incluye actualización PROJECT_STATUS en el mismo commit            | Román (enforza en review)            | Sprint 5         | Kickoff S5           |
| R-S4-4 | CLA Assistant configurada antes del feature freeze Sprint 5                          | Helena + Alejandro                   | 2026-06-11 12:00 | R-5 Sprint 0 (deuda) |
| R-S4-5 | Temperature check equipo Sprint 5 semana 1 (velocity S1=13→S4=8)                     | Tomás                                | 2026-06-05       | Kickoff S5           |
| R-S4-6 | Planning formal Sprint 5 el martes 2026-04-21 tras cierre retro                      | Tomás + Alejandro                    | 2026-04-21 AM    | D-037                |

---

_Abierto por Tomás (Scrum Master), 2026-04-18. Cierre: lunes 2026-04-20 AM._
