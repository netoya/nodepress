## Meet 2026-04-09 — Cómo llevar NodePress al siguiente paso

- **MVP definido:** Blog funcional con CRUD posts + hook system + REST API WP-compatible. **Date:** 2026-04-09
- **Sprint 0 arranca 2026-04-10:** 1 semana de scaffolding (docker, CI, packages init). **Date:** 2026-04-09
- **Licencia pendiente:** GPL-3.0 declarada, Alejandro investiga modelo dual antes de repo público. **Date:** 2026-04-09
- **Sprints de 2 semanas** tras sprint 0. **Date:** 2026-04-09
- **Estrategia de validación:** Blog funcional primero (sprint 1-2), plugin system después (sprint 3). **Date:** 2026-04-09

## Meet 2026-04-09 — Compatibilidad plugins PHP WordPress

- **PHP compat total inviable:** Consenso del equipo. Ningún proyecto fuera de WP lo ha logrado. **Date:** 2026-04-09
- **Estrategia de tiers adoptada:** Tier 1 JS/TS nativo (core), Tier 2 php-wasm lógica de contenido (shortcodes, filtros), sin Tier 3 (PHP con DB). **Date:** 2026-04-09
- **Go-to-market framework:** Fase A (JS nativo 6-12m) → Fase B (top 20 plugins por comunidad 12-18m) → Fase C (PHP bridge enterprise si se paga). **Date:** 2026-04-09
- **Acción Alejandro:** Definir ICP y messaging sin PHP completo con Eduardo. No comunicar PHP compat sin demo real. **Date:** 2026-04-09
- **Spike php-wasm:** Raúl en Sprint 1, 2 días. Resultado informa ADR-003. **Date:** 2026-04-09
- **Posicionamiento:** "CMS moderno con API WP, herramientas de migración, soporte parcial plugins PHP simples via WASM". **Date:** 2026-04-09

## Meet 2026-04-09 — nodepress-wp-plugin-server

- **Plugin-server NO entra en roadmap activo.** Documentado como Tier 3 Future en ADR-003. **Date:** 2026-04-09
- **Eduardo forzó pregunta clave:** "¿NodePress es CMS nativo o orquestador sobre WP?" — Respuesta: CMS nativo. **Date:** 2026-04-09
- **ICP reafirmado:** Agencias y equipos que quieren salir de PHP. WooCommerce legacy no es nuestro cliente hoy. **Date:** 2026-04-09
- **Acción Alejandro:** Definir ICP formal con Eduardo en Sprint 0. **Date:** 2026-04-09
- **Si demanda enterprise en 6 meses:** Arquitectura plugin-server está pensada, condiciones de Helena como pre-requisitos. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Compatibilidad WP = tesis del proyecto, no feature opcional:** cualquier desvío de semántica WP requiere ADR con justificación. **Why:** la compat es lo que vendemos; consistencia interna no compensa perderla. **How to apply:** rechazar PRs que se desvíen sin ADR. **Date:** 2026-04-17
- **Demo objetivo Sprint 1 (30-04):** hook programático muta payload → POST /wp/v2/posts por REST → visible en admin. Sin plugin loader. **Why:** primer demo real para early adopters; plugin loader es Sprint 3. **Date:** 2026-04-17
- **Proceso consistente incluso cuando va bien:** retro de Sprint 0 (sprint de infra) no se salta. **Why:** saltarse ceremonias cuando funcionan descalibra el hábito para cuando dolerán. **Date:** 2026-04-17
- **Repo público al cierre Sprint 2 (14-05), no antes:** CLA Assistant pendiente de configurar. Hasta entonces, cero outreach externo. **Date:** 2026-04-17
- **Win visible 30-04 es innegociable:** PoC con 13 roles activos es caro, sin demo tangible pierde credibilidad interna. **Date:** 2026-04-17

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
