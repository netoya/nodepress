# Reunión: Protocolo de interacción entre agentes

**Fecha:** 2026-04-09
**Participantes:** Tomás (Scrum Master), Román (Tech Lead), Diana (Talent Architect)
**Duración estimada:** 35 minutos

---

## Preparación Individual

### Tomás (Scrum Master)

- Checklist de arranque de 7 pasos como blocking gate
- Exit protocol de 4 pasos post-tarea
- Regla de commit atómico para memorias
- Agentes no se hablan entre sí — todo por orchestrator

### Román (Tech Lead)

- task_log.md como audit trail operacional
- Memorias en commit separado vs junto al código
- Review de agente = otro agente lanzado con contexto del output

### Diana (Talent Architect)

- Protocolo de 4 fases: Context Loading → Task Receipt → Execution → Task Delivery
- Autodefensa en AGENT.md — agente rechaza brief sin context loading
- Task Receipt con "out of scope" explícito
- Handoff via campo "Dependientes desbloqueados" en Task Delivery

---

## Conversación

**Tomás:** Equipo, hoy hemos visto tres fallos de proceso con los agentes. Uno: un agente se lanzó sin leer su perfil y se inventó un rol. Dos: las memorias no se commiteaban. Tres: no hay protocolo formal de qué hace un agente antes, durante y después de una tarea. El ORCHESTRATOR.md tiene reglas, pero no se cumplen consistentemente. La pregunta que traigo no es "¿qué reglas añadimos?" — es "¿qué mecanismo hace que las reglas se ejecuten?"

**Diana:** Exactamente. El problema no es falta de documentación — el ORCHESTRATOR.md §5 ya dice que hay mandatory reads. El problema es que no hay consecuencias verificables. Un agente puede saltarse las lecturas y nadie lo detecta hasta que el output es genérico o incorrecto. Propongo un protocolo de cuatro fases con artefactos explícitos en cada una: Context Loading, Task Receipt, Execution, Task Delivery.

**Román:** Antes de diseñar cuatro fases, quiero entender el coste. Cada fase con su artefacto es overhead. Para una tarea simple — crear un fichero de config — no necesito que el agente escriba un Task Receipt formal. ¿Cómo escalamos esto?

**Diana:** Buen punto. Propongo que escale con la complejidad de la tarea, igual que el ORCHESTRATOR.md §4 escala el número de agentes. Para tareas simples: solo Context Loading obligatorio + Task Delivery mínimo. Para tareas moderate/complex: las cuatro fases completas.

**Tomás:** Me parece sensato. Pero la Fase 0 — Context Loading — no es negociable en ningún caso. Es donde falló hoy. ¿Cómo lo garantizamos?

**Diana:** Dos mecanismos redundantes. Primero: el orchestrator SIEMPRE incluye el bloque de mandatory reads como primera línea del prompt del subagente. Segundo: cada AGENT.md incluye una sección de autodefensa. Si el agente no recibió las lecturas obligatorias en el brief, responde "CONTEXT LOADING INCOMPLETO" y se detiene.

**Román:** La autodefensa del agente me gusta. Es un pattern defensivo. Pero necesito que sea pragmático. Para tareas simples, basta con que el agente lea los ficheros — el Read tool en el log ya lo demuestra.

**Diana:** Acepto simplificarlo. Solo en tareas complex exigimos el Task Receipt formal.

**Tomás:** Siguiente: post-tarea. ¿A quién reporta, quién revisa, dónde anota?

**Diana:** El Task Delivery resuelve esto. Al terminar, el agente produce un bloque estructurado: qué entregó, qué memorias actualizó, qué agentes quedan desbloqueados, si necesita review. El campo "Dependientes desbloqueados" es el mecanismo de handoff.

**Román:** ¿Y el review? Propongo que siga el tiered de contributing.md. La novedad es que el agente reviewer también es un agente lanzado por el orchestrator con el output del productor como input.

**Tomás:** Último punto: task_log.md como audit trail.

**Román:** Un fichero append-only en `.claude/task_log.md`. Una línea por tarea: agente, fecha, tarea, output, commit. Cero fricción.

**Diana:** Me parece bien siempre que sea ligero. El agente añade su línea al final tras Task Delivery.

**Tomás:** Consenso en todo. Protocolo de 4 fases escalable, autodefensa en AGENT.md, memorias con el commit, task_log.md.

---

## Puntos Importantes

1. Context Loading BLOCKING y no negociable — orchestrator lo incluye, agente se defiende si falta. (Diana)
2. Protocolo 4 fases escalable: Context Loading → Task Receipt → Execution → Task Delivery. (Diana)
3. Task Delivery obligatorio con campos: entregable, memorias, dependientes, decisiones, review. (Diana + Román)
4. Autodefensa en AGENT.md — agente rechaza brief sin context loading. (Diana)
5. Review tiered de contributing.md — agente reviewer lanzado por orchestrator. (Tomás + Román)
6. task_log.md audit trail — una línea por tarea, append-only. (Román)
7. Memorias se commitean con el trabajo. (Tomás)
8. Protocolo en docs/ai/agent-task-protocol.md del proyecto. (Román)
9. Diana actualiza AGENT.md con Task Lifecycle + autodefensa. (Diana)
10. Agentes NO se hablan entre sí — todo por orchestrator. (Tomás)

## Conclusiones

- Protocolo de task lifecycle adoptado con 4 fases escalables
- Autodefensa del agente como mecanismo clave
- docs/ai/agent-task-protocol.md como documento vivo
- task_log.md para trazabilidad operacional

## Acciones

| #   | Acción                                               | Responsable | Plazo       |
| --- | ---------------------------------------------------- | ----------- | ----------- |
| 1   | Crear docs/ai/agent-task-protocol.md                 | Diana       | Sprint 0 ✅ |
| 2   | Crear .claude/task_log.md                            | Tomás       | Sprint 0 ✅ |
| 3   | Actualizar AGENT.md con Task Lifecycle + autodefensa | Diana       | Esta semana |
| 4   | Añadir regla commit memorias a CLAUDE.md             | Román       | Sprint 0 ✅ |

---

_Generado por /meet — Trinity_
