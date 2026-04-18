# Demo Plan — 2026-04-30

## What will be demonstrated

End-to-end proof that the NodePress hook system is wired into the REST layer:

1. A hook is registered programmatically at server boot (or via a plugin loader).
2. `POST /wp/v2/posts` with `{ title: "Hello", content: "World" }` is sent.
3. The `pre_save_post` filter mutates the title to `[DEMO] Hello` before the DB write.
4. The `the_content` filter appends `<footer>Powered by NodePress</footer>` to the content
   when the post is serialized for the REST response.
5. `GET /wp/v2/posts/:id` returns the same post — `the_content` filter is re-applied
   at serialize time, so the footer appears again.
6. The admin panel renders the mutated title and footer content.

## How to run it

### Automated (CI / local)

```bash
# From the repo root
npm test -- --project=server demo-end-to-end
```

All 7 assertions in `packages/server/src/__tests__/demo-end-to-end.test.ts` must pass.

### Manual via curl

Start the server in demo mode (requires `DATABASE_URL` env var and a running
Postgres). The `NODEPRESS_DEMO_MODE=true` flag auto-registers the two demo
filters at boot via
`packages/server/src/demo/register-demo-hooks.ts` — no manual wiring needed.

```bash
# Arranca el server en modo demo (hooks auto-registrados):
NODEPRESS_DEMO_MODE=true npm run dev

# En otra terminal:
curl -s -X POST http://localhost:3000/wp/v2/posts \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World"}' | jq .

# Esperado:
# title.rendered   = "[DEMO] Hello"
# content.rendered = "World<footer>Powered by NodePress</footer>"
```

Expected response (abbreviated):

```json
{
  "title": { "rendered": "[DEMO] Hello" },
  "content": { "rendered": "World<footer>Powered by NodePress</footer>" }
}
```

When `NODEPRESS_DEMO_MODE` is unset or `false`, the demo hooks are NOT
registered — the server boots clean, and posts pass through unchanged.

Retrieve the post (replace `:id` with the ID from the POST response):

```bash
curl -s http://localhost:3000/wp/v2/posts/:id | jq .content
```

Expected: `{ "rendered": "World<footer>Powered by NodePress</footer>" }`.

### Admin panel

Open `http://localhost:5173` (admin Vite dev server).
Navigate to Posts → the post created above.
Verify:

- Title column shows `[DEMO] Hello`.
- Content preview shows `World<footer>Powered by NodePress</footer>`.

## Criterio de "demo OK" — 3 assertions mínimas visibles

| #   | Assertion                                                                       | Where                                        |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | `title.rendered` starts with `[DEMO]`                                           | POST response / GET response / Admin list    |
| 2   | `content.rendered` ends with `<footer>Powered by NodePress</footer>`            | POST response / GET response / Admin preview |
| 3   | `GET /wp/v2/posts/:id` returns the same footer (filter re-applied at read time) | curl GET / Admin detail view                 |

All three must be visible simultaneously in either the automated test run or the live curl session. A screenshot of the admin panel showing both mutations counts as evidence for assertion 1 + 2.

## Fallback

If the admin panel is not ready by 2026-04-30, assertions 1–3 can be demonstrated via the automated test output and curl session. The test file is the canonical proof of integration.

## Recorded video

The demo can be captured end-to-end with:

```bash
./scripts/record-demo-video.sh
```

Output: `admin/test-results/demo-30-04-<timestamp>/video.webm` (~720p, ~30–60 s).
Also generates an HTML trace at `admin/playwright-report-demo/` for reviewers.

The script handles: DB seed, backend startup (demo mode), admin startup, readiness polling,
Playwright recording, and process cleanup. Requires Docker + Postgres running.

To run only the Playwright pass (stack already up):

```bash
cd admin && npx playwright test --config=playwright.demo.config.ts
```

### For outreach

Send the `.webm` + a one-paragraph narration:

> "This is NodePress, a modern CMS compatible with the WordPress REST API,
> rewritten in TypeScript. What you're seeing is a fresh install — 5 sample
> posts, a writer's dashboard, and live demonstration of our plugin system
> via the [DEMO] prefix and the footer you'll see at the end. A plugin
> registered at server startup intercepts every post save and every content
> render. No PHP. Written in ~2500 lines of TypeScript."

### Three key moments captured

| #   | Moment                                           | Assertion                      |
| --- | ------------------------------------------------ | ------------------------------ |
| 1   | Dashboard renders with 5 seeded posts            | `Welcome to NodePress` visible |
| 2   | Post saved with `[DEMO]` prefix                  | `pre_save_post` filter proof   |
| 3   | Content view shows `Powered by NodePress` footer | `the_content` filter proof     |
