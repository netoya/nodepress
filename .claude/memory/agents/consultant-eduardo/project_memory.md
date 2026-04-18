---
name: consultant-eduardo-nodepress
description: Project memory for Eduardo (Consultant) in NodePress
type: project
---

## Meet 2026-04-18 — equipo continuemos (Sprint 1 semana 2)

- **Posición en reunión: velocity técnica sin validación de mercado es deuda disfrazada.** Propuse 7 días discovery + 3 días buffer técnico. Alejandro compró el frame pero lo balanceó con hardening paralelo — outreach y hardening no compiten. **Date:** 2026-04-18
- **Outreach privado arranca viernes 2026-04-24:** 15 calls CTOs ICP-1 con demo grabada en 10 días. Budget 0€. Pregunta única: "¿Qué tendría que hacer NodePress para que migraseis un cliente piloto en Q3?" Con Alejandro. **Date:** 2026-04-18
- **CLA Assistant jueves 2026-04-23 (90 min Alejandro + Eduardo).** Bloquea outreach. **Date:** 2026-04-18
- **Messaging A/B test parqueado a cierre Sprint 1 (post 30-04).** Alejandro priorizó "un frente abierto cada vez" sobre ejecutar en paralelo. Disciplina correcta — acepté. **Date:** 2026-04-18
- **Señales mercado semana 14-18 abril:** Strapi v5 con focus TypeScript (valida tesis NodePress), Automattic -16% layoffs (mercado WP en contracción emocional), ventana 12-18 meses antes de que Ghost/Payload cierren oportunidad ICP-1. **Date:** 2026-04-18
- **Benchmark adopción OSS CMS:** Strapi 61k stars en 5 años; primeros 90 días post-público son señal primaria. NodePress no ha empezado a contar — repo privado = discovery ciego. **Date:** 2026-04-18
- **R-9 ping semanal a Alejandro viernes 2026-04-24** con pregunta concreta: ¿de los 3 ICPs, cuál paga primero? **Date:** 2026-04-18
- **ICP-1 (Agency Modernizer):** canal outreach directo a CTOs con repos WP públicos. A ellos enseñamos la demo grabada. **Date:** 2026-04-18

## Meet 2026-04-18 (noche) — Mapa compatibilidad PHP-WASM + Node

- **Mapa de 15 áreas archivado como catálogo, NO backlog.** Alejandro + Román co-sign ADR de archivado. **Date:** 2026-04-18
- **D-008 reafirmado:** NodePress = CMS nativo Node, NO orquestador WP. El mapa entero lo contradice. **Date:** 2026-04-18
- **Tier 2.0 subset mínimo** — lo que los 3 pilotos (Footnotes, Shortcodes Ultimate, Display Posts) ejercitan empíricamente. Raúl spike day 4-6 lo determina. Hard stop lunes 2026-04-22. **Date:** 2026-04-18
- **Tier 3 Full rechazado.** Reconsiderable solo con demanda validada + budget + ≥3 señales outreach plugins Anti-ICP. **Date:** 2026-04-18
- **ADR-017 "Tier 2 Bridge Surface"** — Román escribe tras verdict Raúl. Freeze del surface antes de Sprint 2 kickoff. **Date:** 2026-04-18
- **ADR Bridge Security Boundary** — Helena, antes jueves 24. Gate obligatorio antes de cualquier Tier 2.0 en prod. **Date:** 2026-04-18
- **ADR Bridge Observability** — cada bridge call = span tracerable. Helena, Sprint 2 week 1. **Date:** 2026-04-18
- **cURL sync bloquea event loop** — constraint documentado. HTTP calls en Tier 2.0 requieren async wrapper antes de prod. **Date:** 2026-04-18
- **$wpdb fuera de scope indefinidamente.** No es debate técnico pendiente, es decisión producto. JSONB↔EAV + MySQL bridge = semanas con ROI negativo. **Date:** 2026-04-18
- **Filesystem/Uploads Sprint 3+** — implementación solo cuando piloto lo pida. MinIO en compose solo si se aprueba. **Date:** 2026-04-18
- **Outreach viernes 24-04** pregunta explícita "¿qué plugins PHP usan HOY?" (no wishlist). 3 señales Anti-ICP independientes reabren mapa en Sprint 4 planning. **Date:** 2026-04-18
- **Benchmark competitivo usado como ancla:** Ghost $5M ARR cero compat WP, Strapi 61k stars cero compat, wp-now proyecto Automattic interno nunca comercializado. Ningún CMS comercial gana vía compat. **Date:** 2026-04-18
