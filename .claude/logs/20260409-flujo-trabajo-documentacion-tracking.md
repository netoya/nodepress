# Reunión: Flujo de trabajo, documentación y documento cronológico

**Fecha:** 2026-04-09
**Participantes:** Tomás (Scrum Master), Román (Tech Lead), Martín (Ops Manager)
**Duración estimada:** 30 minutos

---

## Preparación Individual

### Tomás (Scrum Master)

- Diagnóstico: 4 reuniones, 40+ decisiones, gap entre actas y alineamiento
- Propone 3 artefactos: PROJECT_STATUS.md, WORKFLOW.md, ADRs
- Daily asíncrono, ceremonies Scrum ligero
- 26 acciones a convertir en issues

### Román (Tech Lead)

- Estructura docs/: adr/, design/, api/, guides/, status/
- Trunk-based simplificado, PR review tiered
- ADR-003 y ADR-004 urgentes antes de Sprint 1
- contributing.md + PR template

### Martín (Ops Manager)

- GitHub Projects como herramienta única
- Reporte semanal verde/amarillo/rojo para Alejandro
- Decision Log consolidado
- Velocity baseline desde Sprint 0

---

## Conversación

**Tomás:** Equipo, hemos tenido cuatro reuniones hoy y tomado más de 40 decisiones. Las actas están en `.claude/logs/` y son buenas, pero nadie que entre mañana al proyecto sabe de un vistazo qué está hecho, qué hay en marcha y quién hace qué. Sprint 0 arranca mañana. Necesitamos tres cosas antes de irnos: un flujo de trabajo definido, una estrategia de documentación, y un documento cronológico con estados. Propongo tres artefactos, no uno: `PROJECT_STATUS.md` como tracker vivo, `WORKFLOW.md` con las reglas del juego, y los ADRs que ya existen para decisiones de arquitectura.

**Martín:** De acuerdo con la separación, pero primero cerremos tooling. Con 8 personas sin herramienta definida, en dos semanas tendremos Notion para algunos, Linear para otros, y el tablero vacío. Mi propuesta: GitHub Projects como herramienta única de tracking. Kanban nativo, gratuito, vive en el mismo repo. Columnas: Backlog, Sprint, In Progress, Review, Done. Issues con etiquetas de sprint y componente. Un milestone por sprint. No compramos Linear hasta que tengamos cuatro sprints de velocity y veamos que lo necesitamos.

**Román:** GitHub Projects me vale. No quiero herramienta separada — el equipo ya está en GitHub para código. El overhead de sincronizar con una herramienta externa no lo justifica un PoC. Pero necesito que el tablero tenga labels por package: `core`, `db`, `server`, `plugin-api`, `admin`, `cli`. Las PRs se linkean al issue. Así tengo trazabilidad sin esfuerzo extra.

**Tomás:** Perfecto. GitHub Projects queda. Martín, ¿quién crea el tablero y los issues iniciales?

**Martín:** Yo creo el tablero esta tarde. Pero las 26 acciones de las cuatro reuniones de hoy las conviertes tú en issues, Tomás — tú tienes el contexto detallado de cada reunión. Yo no estuve en tres de las cuatro.

**Tomás:** Hecho. Creo los issues esta noche. Ahora, estructura de documentación. Román, ¿propuesta?

**Román:** La estructura que propongo para `docs/`: `adr/` ya existe, `design/` ya existe, añadimos `api/` para specs REST, `guides/` para contributing y plugin dev guide, y `status/` para los reportes semanales de Martín. Los ADRs siguen el formato actual. ADR-003 y ADR-004 los escribo esta semana. El documento cronológico vive como `PROJECT_STATUS.md` en la raíz del repo. Visible a cualquiera que clone. Lo actualiza Tomás en cada Sprint Review.

**Martín:** ¿Y el reporte para Alejandro? `PROJECT_STATUS.md` está orientado al equipo. Alejandro necesita verde/amarillo/rojo, qué se completó, qué está bloqueado. Propongo un reporte semanal separado en `docs/status/YYYY-WNN.md`. Lo genero yo cada viernes. Una página, sin ruido.

**Tomás:** Dos documentos con dos públicos: `PROJECT_STATUS.md` para el equipo, reporte semanal para Alejandro. No se pisan. ¿Román?

**Román:** De acuerdo. Pero el `PROJECT_STATUS.md` tiene que incluir un resumen de decisiones clave con fecha y referencia al ADR o acta. Si alguien nuevo se incorpora, debería entender el proyecto en 5 minutos.

**Tomás:** Lo diseño con esa intención. Ahora, Git flow.

**Román:** Trunk-based simplificado. `main` siempre verde, protegida. Feature branches desde main con vida corta — menos de 3 días. Naming: `feat/NP-XXX-descripcion`, `fix/NP-XXX`, `spike/NP-XXX`. Squash merge. PR review tiered: `packages/core` y `packages/plugin-api` me pasan a mí obligatoriamente. Resto, peer review. Max 400 LOC por PR.

**Martín:** ¿PR sin review más de 2 días?

**Tomás:** Lo menciono en el daily asíncrono. Daily asíncrono en issue de GitHub, no call. Ceremonies síncronas: Planning al inicio, Review + Retro al cierre. DoD Sprint 0 simplificada: `npm run dev` levanta stack, CI verde, packages buildean, typecheck limpio, `npm test` exit 0.

**Román:** Añado: `npm test` exit 0 es el contrato de que la infra de testing funciona.

**Martín:** Al cierre de Sprint 0, genero el primer reporte semanal. Eso me da baseline de velocity.

**Tomás:** Perfecto. Esta tarde: Martín crea tablero, yo creo issues y `PROJECT_STATUS.md`, Román valida. Mañana Sprint 0 arranca alineado.

---

## Puntos Importantes

1. GitHub Projects como herramienta única de tracking. (Martín)
2. `PROJECT_STATUS.md` en raíz — tracker vivo del equipo con decisiones clave. (Tomás)
3. Reporte semanal para Alejandro en `docs/status/`. (Martín)
4. Trunk-based dev, main protegida, squash merge. (Román)
5. PR review tiered — core/plugin-api por Román, resto peer. Max 400 LOC. (Román)
6. Daily asíncrono en issue GitHub. (Tomás)
7. Decision Log integrado en PROJECT_STATUS.md. (Tomás)
8. ADR-003 y ADR-004 esta semana. (Román)
9. DoD Sprint 0: dev levanta, CI verde, typecheck limpio. (Tomás + Román)
10. 26 issues creados esta noche. (Tomás)

## Conclusiones

- Tres artefactos: PROJECT_STATUS.md (equipo), reporte semanal (CEO), ADRs (arquitectura)
- GitHub Projects es el single source of truth
- Trunk-based + PR review obligatoria
- Decisiones de hoy consolidadas esta noche

## Acciones

| #   | Acción                             | Responsable | Plazo              |
| --- | ---------------------------------- | ----------- | ------------------ |
| 1   | Crear tablero GitHub Projects      | Martín      | Hoy                |
| 2   | Crear 26 issues de las 4 reuniones | Tomás       | Hoy noche          |
| 3   | Redactar PROJECT_STATUS.md         | Tomás       | Hoy noche          |
| 4   | Validar PROJECT_STATUS.md          | Román       | Hoy noche          |
| 5   | .github/pull_request_template.md   | Román       | Sprint 0 día 1     |
| 6   | docs/guides/contributing.md        | Román       | Sprint 0 día 1-2   |
| 7   | ADR-003 PHP Compatibility          | Román       | Sprint 0           |
| 8   | ADR-004 Plugin Lifecycle           | Román       | Sprint 0           |
| 9   | Primer reporte semanal             | Martín      | Viernes 2026-04-16 |

---

_Generado por /meet — Trinity_
