## Meet 2026-04-19 — Mini sprint + CSS/templates

- **Sprint 7 ajustado:** #91 dark mode desplazado a Sprint 8 para dar capacity al Paso A (CSS público InlineThemeEngine). **Date:** 2026-04-19
- **Ticket consolidación tokens como P0 Sprint 9:** `@nodepress/design-tokens` — comprometido como P0, no P2, desde hoy. **Date:** 2026-04-19
- **Paso B (FileThemeEngine, ADR-025) = Sprint 8:** No entra en S7. Román escribe ADR-025 el día 1 de Sprint 8. **Date:** 2026-04-19
- **Mini sprint intermedio: delivery sólido.** Bridge PHP-WASM fix, marketplace UI, plugin status fix, demo video 3 plugins. Deuda CSS/templates documentada, ahora con fecha. **Date:** 2026-04-19

## Meet 2026-04-19 — Logs Sprint 6 + README

- **CLA deadline:** Alejandro confirma Org Admin access antes del 2026-04-26. Sin confirmación → escalar como D-039. **Date:** 2026-04-19
- **GitHub Issues mapping #74-#83:** Deuda 3 sprints — completar esta semana. **Date:** 2026-04-19
- **Sprint 6 completado:** 10/10 tickets entregados (P0+P1+P2). Push fcb714d. 238 tests verdes. **Date:** 2026-04-19

## Meet 2026-04-18 — Kickoff Sprint 5

- **D-030 Techo Sprint 5:** 10 tickets (8 slots nuevos + #60 + #61 heredados). Velocity 80% en Sprint 4 — no comprometer más. **Date:** 2026-04-18
- **#60 y #61 son P0:** Entran en los primeros 2 días del sprint. #60 = debrief ICP-1 con Alejandro, determina si Nico y marketplace ADR entran. #61 = CLA webhook + triage externo con Helena. **Date:** 2026-04-18
- **CLA webhook estado:** Acordado activarlo el 23-04-2026 pero sin confirmación registrada. Martín coordina con Helena antes del EOD 2026-04-18 para confirmar operativo. **Date:** 2026-04-18
- **D-038 Nico activación:** Solo si debrief ICP-1 confirma ≥5 calls mencionando plugins de terceros. De lo contrario Sprint 6. **Date:** 2026-04-18
- **Tickets Sprint 5 (#66-#73 aprox):** Martín los crea en PROJECT_STATUS antes del planning del martes 2026-04-20. **Date:** 2026-04-18
- **Sprint 5 milestone:** "NodePress adoptable: CLI funcional, importación WP real, repo abierto a contribuidores con CLA y licencia definida." **Date:** 2026-04-18

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

## Meet 2026-04-18 (noche) — Post-mortem e1b7fbf quickstart roto

- **Diagnóstico:** 7 errores en cadena al arrancar desde clean clone. Ninguno detectado en 2 días por CI mockeado. Fallo SISTÉMICO, no personal. **Date:** 2026-04-18
- **Causa raíz arquitectónica:** ADR-001 NodeNext ESM no validó operacionalmente vs drizzle-kit CJS. Los 3 fixes tsconfig Sprint 0 fueron señal recurrente ignorada. **Date:** 2026-04-18
- **Causa raíz táctica:** migration manual `plugin_registry.sql` (Sprint 0 #21) silenció síntoma — sin journal, drizzle-kit no reconocía el dir como snapshot válido. **Date:** 2026-04-18
- **NodeNext se mantiene.** Workaround `NODE_OPTIONS="--import tsx"` para tooling CJS queda documentado en ADR-014. **Date:** 2026-04-18
- **CI verde ≠ proyecto arrancable:** "108 tests verdes" generó falso confort. Coverage sobre mocks no certifica sistema real. **Date:** 2026-04-18
- **Scope freeze NO aplica a hotfix restaurativo:** restaurar invariante ≠ feature nueva. Regla formalizada por Tomás. **Date:** 2026-04-18
- **TTFA (Time to First API Call) <5 min:** métrica operativa oficial desde este meet. Integrada en burndown semanal de Martín. **Date:** 2026-04-18
- **CI `smoke-fresh-clone` es hotfix bloqueante antes del jueves 23-04** (CLA Assistant con Eduardo). Helena ejecuta miércoles 22. **Date:** 2026-04-18
- **ADR-014 "Developer Quickstart Invariant"** — contrato escrito: `git clone && cp .env.example .env && docker-compose up -d && npm i && npm run db:drizzle:push && npm run dev` pasa en cualquier commit main. Román, jueves. **Date:** 2026-04-18
- **ADR-015 "Tooling runtime boundary"** — Sprint 2. Separación runtime / CI / developer tools con contratos explícitos. **Date:** 2026-04-18
- **Sprint 2 ticket:** recuperar `drizzle:generate + migrate` con journal comiteado. Ingrid brief + Carmen ejec. **Date:** 2026-04-18
- **`drizzle:push` es deuda de prod** — historial migraciones perdido hoy para desbloquear. **Date:** 2026-04-18
- **Regla contributing.md:** PRs que tocan packages/db/**, drizzle.config.ts, tsconfig\*, .env.example exigen smoke fresh-clone en PR body. **Date:\*\* 2026-04-18
- **DoD updated:** "Clean-clone test executed, documented in PR body". **Date:** 2026-04-18
- **Señal equipo sana:** 4 de 5 participantes asumieron responsabilidad sin ser forzados. Tomás indicador de madurez. **Date:** 2026-04-18
- **Martín asume fallo de governance:** commit no pasó por trío (Martín+Román+Tomás) pese a protocolo aprobado esa mañana. No se repite. **Date:** 2026-04-18

## Meet 2026-04-18 — Planning Sprint 3 (roles, taxonomías, admin edit, CLI init)

- **GitHub Issues Sprint 3 (#44-#57 aprox.):** Martín crea antes del 21-04 con labels P0/P1/P2. **Date:** 2026-04-18
- **Release readiness checklist:** Helena + Martín, lista 13-05 EOD. Incluye CI step npm publish CLI. **Date:** 2026-04-18
- **Repo público 14-05:** owner del checklist = Helena + Martín. Demo video Playwright regenerado antes del 14-05. **Date:** 2026-04-18
- **Call-log template listo** (commit 8beb2fd): outreach 15 calls ICP-1 arranca 24-04. **Date:** 2026-04-18
- **Capacity Sprint 3:** mismo equipo, 14 días (05-05 → 16-05), ~12 efectivos con 15% buffer. Sin nuevos miembros hasta Sprint 4. **Date:** 2026-04-18

## Kickoff Sprint 4 — 2026-05-19

- **Acción Martín 20-05:** Crear GitHub Issues #56-#65 con labels P0/P1/P2. **Date:** 2026-05-19
- **Backlog adjustment post-ICP-1 (#60):** Martín + Alejandro, 19-05 PM. **Date:** 2026-05-19
- **Issues externos triage:** Martín + Helena, SLA <48h. CLA obligatorio primer PR externo. **Date:** 2026-05-19
- **Velocity baseline Sprint 4:** Sprint 3 = 11/12. Techo: 10 tickets + 2 buffer. **Date:** 2026-05-19
