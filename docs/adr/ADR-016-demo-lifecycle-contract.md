# ADR-016: Demo Lifecycle Contract

- **Status:** Proposed
- **Date:** 2026-04-18
- **Author:** Román (Tech Lead)
- **Related:** ADR-005 (Hook System Semantics), ADR-014 (Developer Quickstart Invariant)

## Context

Recording the Sprint 1 demo video on 2026-04-18 took four iterations. Each surfaced a new failure class: SPA nav not awaited by Playwright, CORS against the demo backend, slug collision on the second run (HTTP 409 instead of auto-suffix), and duplicated hooks after hot-reload re-registered `pre_save_post`. Root: the demo was a happy-path single run; its lifecycle was never specified, so every failure class surfaced during recording, not development.

## Decision

The demo is a **product artifact**, not a one-shot script. It MUST hold three invariants:

1. **Reproducibility.** Same visible output every run, regardless of DB/cache/uptime. `demo:reset` (truncate + re-seed) is the entry point.
2. **Idempotency.** Any operation repeats N times with zero cumulative effect. Hooks dedup per `pluginId`; colliding titles auto-suffix (WP); seeds upsert.
3. **Determinism.** Playwright assertions predictable byte-for-byte. No volatile DOM timestamps; titles fixed by reset; snapshots only post-reset.

### Derived obligations

- **Backend POST/PUT:** auto-resolve slug collisions (`hello`, `hello-2`, …). HTTP 409 only when the caller forced an explicit colliding `slug`.
- **Demo hooks:** re-registration calls `removeAllByPlugin(DEMO_PLUGIN_ID)` first.
- **Seeds:** `ON CONFLICT DO NOTHING` / upsert.
- **Recording script:** `npm run demo:reset` as step 1, before backend boots.
- **Playwright:** fixed titles; no volatile DOM timestamps.

## Alternatives Considered

- **Single-use demo script.** Rejected — not CI-validable, not re-recordable unattended.
- **Timestamp in title to dodge collision.** Rejected — pollutes the video AND hides a domain bug biting every plugin that creates posts programmatically.
- **Reset DB only, skip auto-suffix.** Rejected — masks a bug that reappears with third-party plugins.

## Consequences

- **Positive:** demo re-recordable unattended; CI smoke feasible post-Sprint 1; plugins stop hitting 409 on title collisions.
- **Negative:** ~4 h today (slug + hook idempotency + reset + ADR). Minor POST handler complexity (bounded suffix loop).
- **Neutral:** the demo becomes a visual integration test also showable to a CTO.

## Enforcement

- `scripts/record-demo-video.sh` runs `demo:reset` as mandatory step 1.
- R-5 extended (contributing.md): PRs touching `packages/server/src/demo/**` or `scripts/record-*` need a freshly re-recorded video in the PR body.
- Future CI `demo-video-smoke` (post-Sprint 1) validates end-to-end on a clean checkout.

## Rollback

Default stays. Revert is trivial — this ADR is documentation. The three code fixes stand alone; only enforcement would be rolled back.

## References

- Incident 2026-04-18: demo video iterations 1–4 (closed by the three parallel fixes in this commit).
- [ADR-005](./ADR-005-hook-system-semantics.md) — `removeAllByPlugin`.
- [ADR-014](./ADR-014-developer-quickstart-invariant.md) — contract-style model.
- `scripts/record-demo-video.sh`, `docs/process/demo-30-04-plan.md`.
