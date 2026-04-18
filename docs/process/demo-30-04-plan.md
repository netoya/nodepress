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

Start the server (requires `DATABASE_URL` env var and a running Postgres):

```bash
cd packages/server && npm run dev
```

Register a hook at runtime (demo script — `scripts/register-demo-hooks.ts`):

```bash
# The demo hooks are registered in index.ts for the demo session only.
# Remove before production.
```

Create a post:

```bash
curl -s -X POST http://localhost:3000/wp/v2/posts \
  -H "Authorization: Bearer dev-admin-token" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","content":"World"}' | jq .
```

Expected response (abbreviated):

```json
{
  "title": { "rendered": "[DEMO] Hello" },
  "content": { "rendered": "World<footer>Powered by NodePress</footer>" }
}
```

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
