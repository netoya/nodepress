## Meet 2026-04-09 — Flujo de trabajo y documentación

- **GitHub Projects:** Martín crea tablero hoy. Columnas: Backlog/Sprint/In Progress/Review/Done. Labels por componente. **Date:** 2026-04-09
- **Reporte semanal:** Martín genera cada viernes en docs/status/YYYY-WNN.md. Verde/amarillo/rojo, 1 página. **Date:** 2026-04-09
- **Primer reporte:** Viernes 2026-04-16 al cierre de Sprint 0. Establece baseline de velocity. **Date:** 2026-04-09
- **PROJECT_STATUS.md:** Creado en raíz del repo. Tomás lo mantiene. Martín lo consulta para reportes. **Date:** 2026-04-09

## Meet 2026-04-17 — Kickoff Sprint 1 y puesta al día

- **Spikes con hard stop día 3:** #25 php-wasm (Raúl) y #27 matriz PHP (Helena). Si día 3 no hay resultado concreto (matriz, benchmark, conclusión binaria), se congela. **Why:** spikes sin límite devoran capacity del core. **Date:** 2026-04-17
- **Daily async formato 3 líneas** — qué mergé ayer / qué abro hoy / qué me bloquea. Canal GitHub Discussions pinned al Sprint. Yo lo monto hoy. **Date:** 2026-04-17
- **Mapping tickets PROJECT_STATUS ↔ GitHub Issues revisado cada Sprint kickoff:** el status es fuente única, GitHub se corrige para matchear. **Date:** 2026-04-17
- **Reporte semanal Sprint 0 pendiente:** lo unifico con reporte cierre Sprint 0 + arranque Sprint 1, publicado hoy. **Date:** 2026-04-17
- **Velocity Sprint 1 = estimación, no predicción:** sin baseline real, primer burndown es hipotético. **Date:** 2026-04-17
- **Capacity Sprint 1:** 13 tickets / 14 días / ~9 días efectivos por persona con 15% buffer. **Date:** 2026-04-17

## Sprint 1 día 2 — ticket numbering reconciliation (2026-04-18)

- **Ticket numbering reconciliation:** Opción B adoptada. Mapping table en top de PROJECT_STATUS.md. **Why:** todos los commits de 2026-04-17 referencian #14-#27; renumerar invalida histórico sin beneficio real. **How to apply:** en commits/code = PROJECT_STATUS #. En PR footers `Closes #N` = GitHub Issue #. Consultar tabla si duda. **Date:** 2026-04-18

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
