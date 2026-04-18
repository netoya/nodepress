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
