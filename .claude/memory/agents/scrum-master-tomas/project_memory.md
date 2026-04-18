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

## Meet 2026-04-18 — equipo continuemos (Sprint 1 semana 2)

- **Scope congelado Sprint 1 — NO abrir Sprint 2 por adelantado:** hardening selectivo + prep quirúrgica. **Why:** 92% done con ritmo x6 es ventana peligrosa para scope creep. **Date:** 2026-04-18
- **/posts list + editor básico entran en Sprint 1** como completude demo: textarea sin bloques. Lucas + Marta. Filtros Martín+Román+Tomás para aprobar. **Date:** 2026-04-18
- **3 tickets hardening backend:** #28 integration tests Postgres real, #29 coverage db INSERT/SELECT/UPDATE, #30 stress circuit breaker concurrent. Ingrid. **Date:** 2026-04-18
- **Skeleton + ADR stub en cli/theme-engine/plugin-api** (3 paquetes con index.ts de 1 línea). Román, antes del viernes 2026-04-24. **Date:** 2026-04-18
- **Protocolo scope freeze activado:** tickets nuevos en Sprint 1 requieren Román + Tomás + Martín. Sin excepción. **Date:** 2026-04-18
- **CLA Assistant jueves 2026-04-23** (90 min Alejandro + Eduardo). Bloquea outreach. **Date:** 2026-04-18
- **Outreach privado arranca viernes 2026-04-24:** 15 calls CTOs ICP-1 con demo grabada, 10 días. Pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" **Date:** 2026-04-18
- **ADRs 005-009 a Accepted antes viernes 24-04.** Sesión asíncrona miércoles. **Date:** 2026-04-18
- **R-2 (contract-freeze) formalizada en apéndice contributing.md** antes lunes 21-04. Tomás. **Date:** 2026-04-18
- **Burndown real cada lunes en GitHub Discussions** desde 21-04. Martín. **Date:** 2026-04-18
- **Messaging A/B test parqueado** a cierre Sprint — un frente abierto cada vez. **Date:** 2026-04-18
- **Temperature check equipo: sin señales burnout hoy** — Tomás sondea cada 3-4 días, no asume que flow = sostenible. **Date:** 2026-04-18

## R-2 Contract Freeze — formalizado 2026-04-18

- **Proceso escrito:** sección "Contract Freeze Protocol (R-2)" añadida a `docs/guides/contributing.md` antes del footer + entrada en Table of Contents.
- **Ejemplo histórico documentado:** HookEntry + PluginContext.addHook() — Román + Ingrid, 2026-04-17, habilitó entrega paralela #14 + #19.
- **Protocolo activo desde Sprint 1.** Cualquier contrato nuevo entre paquetes usa este formato. **Date:** 2026-04-18
