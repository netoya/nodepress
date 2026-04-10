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
