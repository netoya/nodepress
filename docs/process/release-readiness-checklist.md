# Release Readiness Checklist — NodePress v1.0

Owner: Helena + Martín
Deadline: 2026-05-13 EOD (día antes del repo público 2026-05-14)

## Pre-release (2026-05-12 antes del freeze 12:00)

- [ ] Feature freeze activado: no merge de código nuevo post-12:00
- [ ] Todos los tests verdes en CI (main branch)
- [ ] Coverage >80% en packages/server y packages/core
- [ ] 0 errores TypeScript strict
- [ ] 0 errores ESLint
- [ ] Audit npm sin vulnerabilidades críticas

## Demo y documentación

- [ ] README actualizado con demo ≤3 min (Lucas + Valentina)
- [ ] TTFA <5 min verificado en fresh clone (ejecutar smoke-fresh-clone.yml localmente)
- [ ] Demo video regenerado con features Sprint 3 (Playwright spec)
- [ ] Dual license docs completos (MIT + commercial) — Alejandro

## Infraestructura

- [ ] CLA Assistant activo en el repo (Alejandro, debe estar antes del 14-05)
- [ ] npm publish CLI verificado (tag v1.0.0 publicado en registry npm)
- [ ] GitHub Actions: ci.yml, smoke-fresh-clone.yml, coverage.yml, pr-lint.yml todos verdes en main

## Go-live (2026-05-14)

- [ ] Repo cambiado de privado a público en GitHub Settings
- [ ] Release v1.0.0 creado en GitHub con changelog
- [ ] Tweet/anuncio listo (Alejandro + Valentina)
- [ ] Monitoring post-lanzamiento: 48h window de respuesta a issues
