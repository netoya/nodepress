# Incident 2026-04-18 — Quickstart Invariant Broken

**Severity:** Medium (discovery, not prod).
**Detected by:** User manual run after /continuemos meet.
**Resolved by:** Commit e1b7fbf.
**Post-mortem:** [logs/20260418-post-mortem-e1b7fbf-quickstart.md](../../../.claude/logs/20260418-post-mortem-e1b7fbf-quickstart.md)

## Timeline (summary)

- ~15:00 Acta meet "continuemos" planificó outreach viernes 24.
- ~15:30 Usuario intentó `npm run db:migrate` → DATABASE_URL empty.
- ~15:45 6 errores adicionales encadenados (meta missing, .js resolution, etc.).
- ~16:30 Fix commit e1b7fbf pushed to main.
- ~18:00 Post-mortem meet, 5 participants, 11 actions.

## Classification

- Type: hotfix restaurativo (protocolo R-6).
- Scope freeze filter bypassed intentionally per R-6.

## Follow-up actions

See [post-mortem actas](../../../.claude/logs/20260418-post-mortem-e1b7fbf-quickstart.md).
