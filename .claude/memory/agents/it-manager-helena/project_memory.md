---
name: it-manager-helena-nodepress
description: Project memory for Helena (IT Manager) in NodePress
type: project
---

## Sprint 1 día 1 — Tooling quality gates (2026-04-17)

- **ESLint v9 flat config en `eslint.config.js` (root).** Stack: typescript-eslint@8.58.2, eslint-config-prettier@10.1.8, eslint-plugin-react-hooks@7.1.1, eslint-plugin-react@7.37.5 — todo pinned. **Date:** 2026-04-17
- **Rule `no-explicit-any = warn` en source, `off` en tests:** equilibrio pragmático para patrones WP-compat. **Date:** 2026-04-17
- **`projectService` (type-aware rules) NO activada:** monorepo con tsconfigs independientes bloquea el glob `**`. Decisión Sprint 2: crear tsconfig raíz que incluya todo. **Date:** 2026-04-17
- **`packages/spike-phpwasm/` ignorado permanentemente en ESLint + coverage.** **Why:** spike, no production code. **Date:** 2026-04-17
- **`@vitest/coverage-v8@3.2.4` pinned (alineado con vitest@3.x).** Reporter: text, html, json-summary. Coverage threshold activo solo en `packages/core` (90% en 4 métricas). **Date:** 2026-04-17
- **Coverage baseline Sprint 1 día 1:** core/HookRegistry 93.8%/97.5%/100%/93.8% (stmts/branches/funcs/lines). `core/context.ts` en 0% — Ingrid debe añadir tests. **Date:** 2026-04-17
- **Flag MODULE_TYPELESS_PACKAGE_JSON:** root `package.json` sin `"type": "module"`. ESLint funciona con warning de parseo. Solución: renombrar a `eslint.config.mjs` o añadir `"type": "module"` al root — decisión Román porque afecta todos los packages. **Date:** 2026-04-17
- **Flag admin tests desde root:** fallan con "Cannot find module 'react'". Funcionan desde `admin/`. Pre-existente, Lucas/Marta. **Date:** 2026-04-17
- **Pre-commit hooks (husky):** NO configurados. Decisión Sprint 2 tras retro Sprint 1. **Date:** 2026-04-17
- **doc `docs/tooling/quality-gates.md`:** fuente canónica del sistema de calidad del proyecto. **Date:** 2026-04-17

## Sprint 1 — PHP-WASM Extension Matrix (2026-04-17) — #27

- **ADR-008 creado:** `docs/adr/ADR-008-php-wasm-extension-matrix.md`. Status: Proposed. Complementa ADR-003 Tier 2.
- **Extensions bundled en `@php-wasm/node@3.1.20` (15 totales):** SQLite, Libzip, Libpng, OpenSSL, MySQL(legacy), CLI + core PHP: JSON, mbstring, pcre, SPL, date, hash, filter, ctype, tokenizer.
- **Extensiones ausentes críticas (9):** cURL, GD, Imagick, PDO/PDO_MySQL, intl, xml/libxml/SimpleXML, soap, redis/memcached, opcache.
- **Viabilidad estimada Tier 2:** ~15% viable, ~15% marginal, ~70% inviable.
- **Bloqueo principal (~70% inviable):** cURL para APIs externas + GD/Imagick para imágenes + PDO para DB-heavy plugins.
- **Recomendación POC Raúl día 2:** plugin `Footnotes` (MCI Footnotes, ~50KB, pcre+string only) o bespoke `[hello-nodepress]` 20 líneas. NO usar Contact Form 7 (cURL en submit).
- **Criterio de viabilidad formalizado en ADR-008:** sin extensión fuera del bundle, sin cURL/network, sin `$wpdb` raw SQL, sin FS writes, sin loops proporcionales a datos.
- **Fuente:** knowledge base + spike day 1 Raúl. Pendiente validación empírica día 2.

## Sprint 1 día 2 — ADR-008 revision (2026-04-18)

- **ADR-008 status changed:** Proposed → Revised (2026-04-18). Empirical data from Raúl spike day 2.
- **Actual extension count:** 44 (vs. ~20–21 estimated day 1). Full flat list pending spike day 3 capture.
- **Extensions now confirmed present (were NOT Available in day 1):** cURL, GD, Imagick, PDO, PDO_MySQL, mysqli, SOAP, dom, libxml, SimpleXML, xml, xmlreader, xmlwriter.
- **Extensions confirmed absent:** intl/ICU, redis/memcached, opcache, mcrypt.
- **Viability estimates revised:** Inviable ~50% (down from 70%), Marginal ~25% (up from 15%), Viable ~25% (up from 15%).
- **Plugins reclassified:** TablePress → ✅ Viable. Contact Form 7 → ⚠️ (was already ⚠️ but reasoning updated — cURL present, SMTP still blocks full send). WooCommerce basic display → ⚠️. Yoast SEO (meta only) → ⚠️. Akismet → ⚠️. WP All Import — partially unblocked (pending Sprint 2). ACF — pending re-eval Sprint 2.
- **New constraint documented:** cURL in WASM is synchronous — blocks Node.js event loop. Requires async wrapper before production use.
- **Sprint 2+ POC recommendation added:** Contact Form 7 render + cURL HTTP POST mock, or bespoke `[fetch-nodepress]` shortcode, to validate cURL/GD end-to-end.
- **Lesson learned captured in ADR:** Empirical validation mandatory before finalizing any runtime capability inventory.

## Sprint 1 día 2 — retro R-6 + R-7 (2026-04-18)

- **R-6 husky prototype:** husky@9.1.7 + lint-staged@16.4.0 instalados (pinned). `.husky/pre-commit` = `npx lint-staged`. Config `lint-staged` en root `package.json`: `*.{ts,tsx}` → eslint --fix + prettier, `*.{md,yaml,yml,json}` → prettier. NO typecheck en pre-commit (lento). `prepare: husky` añadido automáticamente por `husky init`. Status: opt-in, evaluate retro Sprint 1.
- **R-7 db coverage threshold:** `packages/db/vitest.config.ts` creado con thresholds 75/75/70/75 (stmts/branches/funcs/lines). Modo: **warn-only** — CI debe usar `continue-on-error: true` en el job de db hasta Sprint 2. Smoke test placeholder creado en `packages/db/src/__tests__/smoke.test.ts` (`it.todo`).
- **quality-gates.md actualizado:** sección "## Husky (prototype / opt-in)" añadida + tabla thresholds actualizada con packages/db.

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

## Sprint 1 sem 2 día 0 — CI smoke-fresh-clone (2026-04-18)

- **Workflow creado:** `.github/workflows/smoke-fresh-clone.yml`. Job `smoke-fresh-clone`. **Date:** 2026-04-18
- **Trigger:** `push` a main + `pull_request` paths: `packages/db/**`, `drizzle.config.ts`, `tsconfig*.json`, `package.json`, `.env.example`, `docker-compose.yml`, `packages/server/**/index.ts`. **Date:** 2026-04-18
- **Service Postgres 16-alpine:** usuario/pass/db = nodepress/nodepress/nodepress. Sin docker-compose manual — GitHub Actions service nativo. Health check via `pg_isready`. **Date:** 2026-04-18
- **TTFA medido:** `date +%s` antes de `db:drizzle:push` → `date +%s` tras smoke curl. Reportado en logs. Falla si >300s, warn si >120s. **Date:** 2026-04-18
- **Steps:** checkout → setup-node 22 + cache npm → npm ci → cp .env.example .env (falla si no existe) → db:drizzle:push → build packages/db → start server bg → poll localhost:3000 30s → curl /wp/v2/posts espera `[]` → TTFA report → kill bg server. **Date:** 2026-04-18
- **PR template actualizado:** checklist item `Smoke fresh-clone` añadido. **Date:** 2026-04-18
- **docs/tooling/quality-gates.md:** sección "Smoke Fresh-Clone (post-mortem e1b7fbf)" añadida. **Date:** 2026-04-18
- **Constraint aplicada:** ci.yml NO modificado. Workflow nuevo independiente. **Date:** 2026-04-18
- **Deadline:** miércoles 22-04 (bloquea CLA Assistant jueves 23 + outreach privado viernes 24). Artefactos entregados 2026-04-18. **Date:** 2026-04-18

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

## Meet 2026-04-18 (noche sesión 2) — Reabrir mapa PHP-WASM tras push-back del PO

- **Archivado revocado.** Nuevo ADR "Phased WP Bridge Roadmap" reemplaza el archivado anterior. 3 fases con criterios explícitos. **Date:** 2026-04-18
- **Reconocimiento compartido:** consenso interno ≠ señal de mercado. El PO aportó info que el equipo no tenía. No fue decisión equivocada — fue insuficiente. **Date:** 2026-04-18
- **Contraejemplo Faust.js + WPGraphQL** (WP Engine, 400k+ sites) valida compat parcial estratégica. Eduardo retiró generalización "ningún CMS gana vía compat" → aplica solo a full compat. **Date:** 2026-04-18
- **Fase A (Sprint 2-3):** Options R/W, Transients, Object Cache, Users inyectable, `$_SERVER`, lifecycle reset, hooks cross-runtime. ~8 días Carmen+Ingrid. **Date:** 2026-04-18
- **Fase A dividida:** subset Sprint 2 (Options R/W + hooks + `$_SERVER`) + completion Sprint 3 (Users + Cache + Transients + lifecycle) — protege scope freeze Sprint 2. **Date:** 2026-04-18
- **Fase B (Sprint 4-5):** HTTP async wrapper con Worker Threads, cookies context bridge, sessions store. Gated por ≥5 sí en outreach. **Date:** 2026-04-18
- **Fase C (Sprint 6+):** `$wpdb` proxy, FS virtual + S3/MinIO, Uploads. Gated por piloto pagando. **Date:** 2026-04-18
- **Tier 3 full orquestador WP: RECHAZADO PERMANENTEMENTE.** D-008 intacto. **Date:** 2026-04-18
- **Re-spike Raúl con plugins reales:** ACF (1.5M sites), Yoast SEO (5M sites), WooCommerce display básico, Contact Form 7. Hard stop jueves 2026-04-25. Los 3 pilotos anteriores (Footnotes/Shortcodes Ultimate/Display Posts) eran juguetes. **Date:** 2026-04-18
- **ADRs Helena innegociables:** bridge security boundary (jueves 23-04) + observability (Sprint 3 kickoff). Gates pre-prod. **Date:** 2026-04-18
- **HTTP async wrapper Worker Threads** fuera de Fase A — requiere spike dedicado. Entra Fase B o nunca. **Date:** 2026-04-18
- **Outreach viernes 24-04:** pregunta binaria con fricción económica: "¿pagarías X€ por piloto Q3 si plugins contenido funcionaran?" Binaria sí/no. **Date:** 2026-04-18
- **Criterios activación/archivado explícitos en ADR roadmap ANTES de código Fase A:** ≥5 sí → Fase B. <3 sí → archivar Fase A sin sunk-cost rework. **Date:** 2026-04-18
- **Co-firmas ADR roadmap:** Alejandro + PO + Román + Eduardo. El PO queda en el documento para evitar re-archivados silenciosos. **Date:** 2026-04-18
- **ClassicPress y PressNext fracasaron** por coste mantenimiento (no premisa). Lección: versión WP target única (6.4 LTS) y congelar. **Date:** 2026-04-18
- **Respeto al cierre ciclo anterior:** nadie arranca scope esta noche. Lunes 21 re-spike. **Date:** 2026-04-18

## REVOCACIÓN — Meet sesión 2 "Reabrir mapa PHP-WASM" (2026-04-18)

> **ESTA DECISIÓN FUE REVOCADA por clarificación del PO el mismo 2026-04-18.**
> El PO clarificó que "no vale" significaba **descartar el mapa entero**, no reabrir con plan por fases.
> Ver `docs/process/comunicados/2026-04-18-reversion-mapa-php-wasm.md`.

- **Plan por fases A/B/C (Phased WP Bridge Roadmap): RECHAZADO** — no se escribe ADR, no se implementa. **Date:** 2026-04-18
- **Re-spike con 4 plugins reales (ACF, Yoast, WooCommerce, Contact Form 7): CANCELADO.** Vuelve al spike original validated GO. **Date:** 2026-04-18
- **Tier 2.5 "bridges de contenido real": DESCARTADO.** Tier 2 sigue siendo content-only según ADR-003 + ADR-008. **Date:** 2026-04-18
- **Outreach 24-04:** pregunta NEUTRAL sobre dolor/stack, NO sobre plugins compat. **Date:** 2026-04-18
- **D-008 intacto:** CMS nativo Node, NO orquestador WP. **Date:** 2026-04-18
- **ADRs Helena (security + observability) MANTIENEN:** saludables con independencia del scope. **Date:** 2026-04-18
- **Lección:** "no vale" del PO puede significar "no vale esta solución" O "no vale el tema". Próxima vez, preguntar binaria antes de re-abrir. **Date:** 2026-04-18

## Meet 2026-04-18 — Kickoff Sprint 2

- **ADR bridge security boundary: deadline jueves 23-04.** Gate para CLA Assistant y para Tier 2 en staging. Sin dependencia de ADR-015 (capas distintas confirmado con Román). **Date:** 2026-04-18
- **ADR bridge observability: Sprint 2 semana 1.** Cada bridge call = span traceable. Si se difiere a Sprint 3, Tier 2 ship sin observability = rework. **Date:** 2026-04-18
- **CI gaps (coverage artefact, PR lint, npm audit) → S2-infra-backlog.** No Sprint Goal pero visibles en GitHub antes del lunes. **Date:** 2026-04-18
- **drizzle:push = no apruebo despliegue DB sin journal.** Bloqueo hasta que Ingrid/Carmen recuperen migrate con journal S2-W1. **Date:** 2026-04-18
