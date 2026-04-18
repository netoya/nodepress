## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **Sprint 0 arranca 2026-04-10:** 1 semana. Scaffolding monorepo, docker, CI, packages init. **Date:** 2026-04-09
- **Sprint 1:** 2 semanas. Backend: hooks + posts CRUD + REST. Frontend: admin shell + dashboard. En paralelo. **Date:** 2026-04-09
- **Sprints de 2 semanas** a partir de sprint 1. **Date:** 2026-04-09
- **DoD acordada:** TS strict, tests Vitest, lint/prettier verde, PR review, tests WP compat para endpoints, no deps circulares core↛db. **Date:** 2026-04-09
- **Acción Tomás:** Formalizar DoD en documento del repo, sprint 0 día 1. **Date:** 2026-04-09
- **Velocity desconocida:** Primera iteración, planificar conservador. **Date:** 2026-04-09
- **Roadmap sprints:** S0 scaffolding → S1 blog CRUD + admin shell → S2 roles + taxonomías → S3 plugin-api. **Date:** 2026-04-09

## Meet 2026-04-09 — Flujo de trabajo y documentación

- **GitHub Projects:** Herramienta única de tracking. Columnas: Backlog/Sprint/In Progress/Review/Done. Labels por componente. **Date:** 2026-04-09
- **PROJECT_STATUS.md creado:** En raíz del repo. Tracker vivo con decisiones, estados, acciones. Tomás actualiza en Sprint Review. **Date:** 2026-04-09
- **Daily asíncrono:** Issue diario en GitHub. No call. Ceremonies síncronas: Planning, Review+Retro. **Date:** 2026-04-09
- **Acciones Tomás:** Crear 26 issues esta noche. Mantener PROJECT_STATUS.md. **Date:** 2026-04-09
- **DoD Sprint 0:** npm run dev levanta, CI verde, packages buildean, typecheck limpio, npm test exit 0. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Sprint 0 cierre formal:** Actualizar PROJECT_STATUS.md a ✅ CERRADO tras merge de ci/db-migrations-cleanup. **Why:** estaba "EN CURSO" y los commits finales aparecían como "pending". **How to apply:** en cualquier Sprint Review futuro, cerrar estado en el doc antes de hablar de sprint siguiente. **Date:** 2026-04-17
- **Retro async obligatoria incluso en sprints de infra:** 3 preguntas (qué funcionó / qué frenó / qué probamos). **Why:** Alejandro priorizó proceso consistente sobre proceso "útil-cuando-conviene". **How to apply:** lanza retro async todo sprint, cierre viernes mediodía. **Date:** 2026-04-17
- **Daily async formato fijado:** 3 líneas por persona — qué mergé ayer, qué abro hoy, qué me bloquea. Canal en GitHub Discussions pinned al Sprint. Martín lo monta. Tomás sincroniza tablero. **Date:** 2026-04-17
- **Ausencia 2 días sin postear = check-in privado, no público.** **Why:** daily es detección de bloqueos, no control de presencia. **Date:** 2026-04-17
- **Demo objetivo Sprint 1 (30-04):** hook registrado programáticamente muta payload → POST /wp/v2/posts → render admin. Plugin loader fuera de scope. **Date:** 2026-04-17
- **Wireframes dashboard Lucas:** Tomás los persigue con Sofía, deadline viernes 2026-04-18. **Date:** 2026-04-17

## Sprint 1 día 1 — retro + pings (2026-04-17)

- **Retro Sprint 0 async lanzada:** `docs/process/retros/sprint-0-retro.md`. Participantes: Alejandro, Román, Ingrid, Lucas, Tomás, Martín, Helena. Cierre viernes 2026-04-18 12:00. Tomás consolida acciones viernes tarde. **Date:** 2026-04-17
- **Ping Sofía wireframes dashboard:** `docs/process/pings/2026-04-17-sofia-wireframes-dashboard.md`. Necesita wireframes 4 estados para #23 semana 2. Deadline viernes EOD. Canal: commit a `admin/docs/design/wireframes-dashboard.md`. Riesgo si no llegan: Lucas improvisa, hay rework. **Date:** 2026-04-17
- **Health check día 1 en PROJECT_STATUS.md:** 7 tickets DONE + tooling, ~80 tests verdes, spike #25 en curso. Sección nueva añadida antes del footer. **Date:** 2026-04-17
