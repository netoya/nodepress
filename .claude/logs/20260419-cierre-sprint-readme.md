# Reunión: Cierre de sprint actualizando el README

**Fecha:** 2026-04-19
**Participantes:** Tomás (Scrum Master), Martín (Ops Manager), Román (Tech Lead)
**Duración estimada:** 25 min

---

## Preparación Individual

**Tomás:** La decisión ya estaba tomada en la retro S6 (I-3: "A partir de S7, README refresh forma parte del DoD"). Propone Sprint Closing Checklist mínimo (3-4 ítems) como artefacto de la ceremonia. El README no es un entregable de PR sino de sprint-level. Criterio: "¿refleja lo que entregamos?" Si sí, no-op documentado. Si no, actualizar.

**Martín:** La retro S6 ya documentó el problema (README 5 sprints sin actualizar) y la solución. Lo ve como gate obligatorio, no opcional. El dueño técnico debe ser Román (contenido técnico denso), no el Scrum Master. El CI guard tiene que vivir en el commit de cierre, no en cada PR. El README desactualizado tiene coste reputacional real cuando lleguen contribuidores externos (CLA en curso).

**Román:** README ya tiene drift de nuevo al cierre de la retro S6. Propone triángulo de tres mecanismos: CI guard (commit `docs(readme): Sprint N close`) + DoD del sprint + ítem en plantilla de retro. Secciones mutables definidas: badge, "What's shipped", "What's in Sprint N+1", nº tests. Todo lo demás congelado. No formalizar hasta correr el proceso una vez en Sprint 7 (patrón ADR-014).

---

## Conversación

**Tomás:** Voy directo al punto porque ya lo tenemos medio resuelto. La retro de Sprint 6 dejó escrito I-3: "A partir de S7, README refresh forma parte del DoD." La propuesta que trae el usuario no es nueva — es exactamente lo que el equipo ya decidió. Lo que no tenemos es el cómo: quién lo hace, cuándo en la ceremonia, y qué pasa si no se hace. Propongo que salgamos de aquí con un Sprint Closing Checklist que viva en `docs/process/` y que tenga esos tres puntos resueltos.

**Román:** Completamente de acuerdo con Tomás en el diagnóstico. Y añado algo que encontré revisando el README ahora mismo: ya volvemos a tener drift. El README dice "Sprint 6 active" cuando PROJECT_STATUS ya lo marca cerrado. Y menciona "23 ADRs Accepted" — tenemos 24. El mismo patrón que vivimos cinco sprints seguidos. Esto me refuerza en una cosa: un mecanismo humano solo no es suficiente. Necesitamos tres redundantes, el mismo triángulo que usamos en ADR-014 y ADR-016. Primero, un CI guard que falle si el badge del sprint en README no coincide con el sprint más reciente en PROJECT_STATUS. Segundo, el ítem en el DoD del cierre de sprint. Tercero, el ítem fijo en la plantilla de retro de Tomás. Si falla uno, los otros dos atrapan.

**Martín:** El README ya está desactualizado de nuevo — eso lo dice todo. Pero tengo un punto operativo sobre el CI guard que propone Román: lo apoyo, pero hay que tener cuidado con el scope. Un CI job que falle en cada PR porque el README no tiene el sprint actualizado va a generar ruido. El guard tiene que vivir en el cierre de sprint, no en el pipeline de feature. Helena puede implementarlo sin problema, pero necesitamos ser explícitos: se ejecuta en el commit de cierre de sprint, no en todos los merges.

**Román:** Tienes razón, Martín. El job dispara en un commit con convención específica — por ejemplo `docs(readme): Sprint N close` — no en cada PR. El mismo patrón que usamos con los smoke tests: corren en la rama de cierre, no en feature branches. Eso lo resuelve.

**Tomás:** Bien. Entonces el checklist de cierre queda así, y lo escribo yo antes del kickoff de Sprint 7: uno, retro cerrada y log en `.claude/logs/`; dos, PROJECT_STATUS actualizado a CERRADO; tres, README revisado — si nada cambió, confirmación explícita de Román de que está al día; cuatro, commit `docs(readme): Sprint N close` que activa el CI guard. ¿Algo más que falte?

**Martín:** Añado una cosa importante: el criterio de "qué entra en el README" necesita estar claro o en tres sprints lo llenamos de detalles que pertenecen a PROJECT_STATUS. Román, ¿puedes definir las secciones que se tocan y las que están congeladas?

**Román:** Ya lo tengo pensado. Las secciones mutables son cuatro: el badge de estado `Sprint N closed · Sprint N+1 active`, la sección "What's shipped" donde añadimos bullets del sprint cerrado, la sección "What's in Sprint N+1" que se reemplaza completa, y el número de tests si el orden de magnitud cambia. Todo lo demás — arquitectura, Quick Start, Contributing, License — está congelado y solo se toca si hay ADR que mueva el contrato. Y el principio que ya acordamos sigue: README es cartel, PROJECT_STATUS es inventario. No duplicar los tickets en el README.

**Tomás:** Una cosa más que quiero dejar en el checklist: si Román no está disponible el día del cierre, ¿quién aprueba el README? No puede quedar el sprint colgado.

**Martín:** Fácil. Fallback por escrito: si Román no responde en 24 horas post-retro, el Lead que más contribuyó ese sprint puede aprobar. Eso va en `contributing.md`, no en la memoria oral.

**Román:** De acuerdo. Y última cosa: no formalizamos el proceso en `contributing.md` hasta que lo corramos una vez en Sprint 7. Mismo patrón que ADR-014 — Proposed hasta el primer run real. Si al cerrar Sprint 7 hay algo que ajustar, lo ajustamos. Si sale bien, lo formalizamos en Sprint 8.

**Tomás:** Perfecto. Cierro la reunión con el plan: yo escribo el Sprint Closing Checklist antes del kickoff de S7. Román define las secciones mutables del README como nota en contributing.md. Martín añade el fallback de reviewer. El CI guard lo proponemos a Helena para que lo implemente en S7. Y al cerrar S7 evaluamos si el proceso funciona antes de formalizarlo.

---

## Puntos Importantes

1. **La decisión ya estaba tomada** (Tomás): retro S6 I-3 dice "README refresh en DoD desde S7". Esta reunión operacionaliza, no debate.
2. **README ya tiene drift de nuevo** (Román): "Sprint 6 active" cuando está cerrado, "23 ADRs" cuando hay 24. Un mecanismo humano solo no es suficiente.
3. **Triángulo de tres mecanismos redundantes** (Román): CI guard + ítem en DoD de cierre + ítem en plantilla de retro.
4. **CI guard solo en commit de cierre, no en cada PR** (Martín): convención `docs(readme): Sprint N close`.
5. **Secciones mutables definidas** (Román): badge, "What's shipped", "What's in Sprint N+1", nº tests. Todo lo demás congelado.
6. **Fallback de reviewer documentado** (Martín): Lead más contribuyente si Román no responde en 24h post-retro.
7. **No formalizar hasta el primer run en S7** (Román): Proposed hasta cierre S7, formalización Sprint 8.

## Conclusiones

- **Sprint Closing Checklist** (4 ítems): retro + log, PROJECT_STATUS CERRADO, README revisado/confirmado, commit de cierre. Tomás lo escribe antes del kickoff S7.
- **Secciones mutables + fallback reviewer** en `contributing.md`. Román lo añade.
- **CI guard** propuesto a Helena para Sprint 7.
- **Proceso Proposed** hasta cierre S7 → formalización Sprint 8.

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Escribir Sprint Closing Checklist en `docs/process/sprint-close-checklist.md` | Tomás | Antes del kickoff S7 (2026-06-30) |
| 2 | Añadir secciones mutables README + fallback reviewer a `docs/guides/contributing.md` | Román | Antes del kickoff S7 |
| 3 | Proponer CI guard (`readme-freshness.yml`) a Helena para S7 | Tomás | 2026-04-21 |
| 4 | Primer run del proceso al cierre de Sprint 7 → evaluar y ajustar | Tomás + Román | 2026-07-11 |
| 5 | Formalizar en `contributing.md` si S7 run sale bien | Román | Sprint 8 día 1 |

---

_Generado por /meet — Trinity_
