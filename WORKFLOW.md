# NodePress — Workflow

> Referencia rápida. Documento completo en [docs/guides/contributing.md](docs/guides/contributing.md).

## Quick Reference

| Aspecto | Decisión |
|---------|----------|
| **Git flow** | Trunk-based. `main` protegida. Squash merge. |
| **Branches** | `feat/NP-XXX`, `fix/NP-XXX`, `spike/NP-XXX` — vida < 3 días |
| **PR review** | 1 approval mín. `core` + `plugin-api` → Román. Max 400 LOC |
| **DoD** | TS strict, Vitest, lint/prettier, PR review, WP compat tests, sin circular deps |
| **Commits** | Conventional commits en inglés (`feat:`, `fix:`, `chore:`, etc.) |
| **Daily** | Async en issue GitHub antes de 10:00 |
| **Planning** | Inicio sprint, 1h síncrono |
| **Review** | Fin sprint, 30min, demo + actualizar PROJECT_STATUS.md |
| **Retro** | Tras review, 45min, Start/Stop/Continue |
| **Tracking** | GitHub Projects — un tablero, labels por package |
| **ADRs** | Obligatorio si afecta > 1 módulo. Inmutables. `docs/adr/NNN-titulo.md` |

## Key Documents

- [PROJECT_STATUS.md](PROJECT_STATUS.md) — estado del proyecto, decisiones, sprints
- [docs/guides/contributing.md](docs/guides/contributing.md) — guía completa de contribución
- [docs/adr/](docs/adr/) — Architecture Decision Records
