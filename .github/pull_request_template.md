## Description

<!-- What does this PR do? Why? -->

## Checklist (Definition of Done)

- [ ] TypeScript strict — sin errores
- [ ] Tests con Vitest (camino feliz)
- [ ] Linter/Prettier en verde
- [ ] Si hay endpoint REST: test de integración WP compat
- [ ] Sin dependencias circulares (core no importa de db)
- [ ] PR < 400 líneas de código (excl. tests)
- [ ] Rutas en `PROJECT_STATUS.md` coinciden con rutas reales del repo (si aplica)
- [ ] Si se modifica tooling (tsconfig, vitest, build): matriz canary `build + typecheck + test` verde en core, db, admin (R-1 retro Sprint 0)
- [ ] Si se añade/modifica desviación de semántica WP: ADR obligatoria antes de merge (regla kickoff Sprint 1)

## Referencias

<!--
Usa números de PROJECT_STATUS (#14-#27) en título y cuerpo.
GitHub Issue # solo para el footer: `Closes #N` (ver mapping table al top de PROJECT_STATUS.md).
-->

Closes #
