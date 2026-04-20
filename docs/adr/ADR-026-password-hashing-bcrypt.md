# ADR-026: Password Hashing — bcrypt for Users CRUD

- **Status:** Accepted
- **Date:** 2026-04-20
- **Accepted:** 2026-04-20
- **Author:** Román (Tech Lead), co-author Raúl (Dev Backend — spike executor)
- **Sprint:** Mini-sprint intermedio (Pages / Users / Settings, 2026-07-14 → 2026-07-18)
- **Related:** ADR-001 (Architecture Overview — Bearer auth), ADR-014 (Developer Quickstart Invariant — npm install must succeed on clean clone), ADR-015 (Tooling Runtime Boundary — native modules are Lane A runtime)

## Context

Mini-sprint M4 implements `POST /wp/v2/users` (create), `PUT /wp/v2/users/:id` (update), and `DELETE /wp/v2/users/:id` (delete with reassignment). Until now NodePress only exposed `GET /wp/v2/users` (list) and `GET /wp/v2/users/me`, neither of which touches passwords. The moment we accept password material via REST, three decisions must be explicit and must not drift over time:

1. **Algorithm.** Which one-way hash function protects the stored password against offline attack if the DB is exfiltrated.
2. **Contract.** When is the hash generated, when is it rotated, and — non-negotiable — what is the response contract that guarantees the password or its hash is never returned, logged, or embedded in a serialized user object.
3. **Build portability.** NodePress ships to Alpine-based Docker images as a target deployment. Any native module we adopt must either build cleanly on Alpine or have a pre-agreed fallback that does not require a new team decision under production pressure.

The `users` table schema (`packages/db/src/schema/users.ts`) already has a `passwordHash` column declared. Sprint 0 / Sprint 1 never exercised it because no endpoint ever wrote to it. M4 is the first write path; waiting to decide the algorithm until an M4 PR is on the table would put the decision on the critical path of a frontend-blocking backend ticket.

The broader industry context shapes the shortlist: bcrypt (1999), scrypt (2009), argon2 (Password Hashing Competition winner 2015). All three are memory-hard or memory-aware, all three resist GPU-based offline attack at reasonable cost factors, and all three are available in the Node ecosystem. The difference is not primarily cryptographic strength — at configured cost factors all three exceed the 2026 threshold for brute-force resistance — but tooling ergonomics, maturity, and build portability.

**Spike executed 2026-04-20:** native `bcrypt` installed and verified on darwin arm64:

```
npm --workspace packages/server install bcrypt@^5.1.1
# → added 39 packages, audited 962 packages, 0 build errors on darwin arm64
node -e "const b=require('bcrypt'); b.hash('test',12).then(h=>b.compare('test',h)).then(console.log)"
# → true
```

**Result: bcrypt nativo build verde** on the development reference platform. Alpine/Docker verification is carried out in CI by the M4 delivery (Raúl runs the npm install inside the `node:20-alpine` image during the M4 PR validation). The fallback path below is **pre-approved**, so that if Alpine produces a prebuilt-binary miss, the team does not need a second ADR under time pressure.

## Decision

**bcrypt with cost factor 12, via the native `bcrypt` npm package, with `bcryptjs` as a pre-approved automatic fallback if the native build fails on Alpine.** Password material never leaves the hashing boundary except as salted hash stored in `users.passwordHash`; the plaintext is discarded in the same function that received it.

### 1. Algorithm and library

- **Primary:** `bcrypt@^5.1.1` (native addon over OpenBSD `crypt_blowfish`).
- **Fallback (pre-approved, no new ADR required):** `bcryptjs@^2.4.3` (pure JavaScript implementation of the same algorithm, byte-identical hash format — `$2a$`/`$2b$` — which means hashes written by one library verify correctly through the other).
- **Cost factor:** `12`. On darwin arm64 reference hardware, ~150ms per hash; on a production Alpine container with ~2 vCPU, ~300-400ms per hash. Slow enough to be an offline-attack deterrent (roughly 2.5–3 hashes/sec/core → 95 bits of search space per year of GPU brute-force at 2026 hash-rates), fast enough not to add user-perceptible latency to login or create-user flows.

The fallback is pre-approved so the M4 delivery does not stall on a re-decision if Alpine's prebuilt-binary bucket misses the current Node version. Both libraries share the hash format — migrating between them is a `require` swap in a single file (`packages/server/src/services/password.ts` or equivalent), zero data migration.

### 2. Response contract: password material never surfaces

Non-negotiable invariant, enforced by the serializer:

- **`password`** (plaintext) is accepted **only** in request bodies of `POST /wp/v2/users` and `PUT /wp/v2/users/:id`. It is **never** echoed in a response body, **never** logged (neither at the Fastify request log level nor at the application log level), and **never** included in error messages.
- **`passwordHash`** (stored hash) is **never** returned in any serialized user object. The user serializer (`toWpUser` equivalent) explicitly omits the field. No `context=edit` variant exposes it — unlike post raw content (ADR-009), there is no admin-only unmasked variant because a password hash is not content, it is authentication material.
- **Meta / full-object dumps** (`JSON.stringify(userRow)`) are forbidden at any serialization boundary that touches HTTP. Tests assert this negatively: a regression that adds `passwordHash` to the response payload is caught by the M3/M4 test suite.

### 3. Password rotation: PUT only rotates the hash when `password` is explicit in the body

The update semantics match WordPress REST and avoid the subtle bug of "PUT without password wipes the hash":

- `PUT /wp/v2/users/:id { "email": "new@x.com" }` → email is updated, **hash is untouched**.
- `PUT /wp/v2/users/:id { "password": "new-secret-12" }` → hash is re-generated from `"new-secret-12"` with cost factor 12; other fields untouched.
- `PUT /wp/v2/users/:id { "password": "" }` → validation error (422), empty password rejected at schema level.
- `PUT /wp/v2/users/:id { }` → no-op (or 200 with unchanged user, depending on how Ingrid's schema layer treats empty bodies — this is a surface decision, not a password one).

The contract is: **the hash rotates if and only if the body explicitly contains a non-empty `password` string**. Absence of the key does not mean "clear the hash". The M4 implementation must not pass `passwordHash: null` or `passwordHash: undefined` to the UPDATE — it must conditionally include the column in the SET clause based on `"password" in body`.

### 4. DELETE with reassignment: `?reassign=<userId>` in a transaction

`DELETE /wp/v2/users/:id` matches WordPress's `force=true&reassign=<id>` semantics with two concrete constraints:

- **`?reassign=<userId>` is required.** A DELETE without the query parameter returns 400. This mirrors WP's behaviour and prevents orphaning content.
- **The reassignment and delete happen in a single transaction** (`db.transaction(async (tx) => { ... })`). The two statements are:
  1. `UPDATE posts SET author_id = <reassignTarget> WHERE author_id = <deleteTarget>` — reassigns authored posts (and pages, thanks to ADR-025 polymorphism) to the target user.
  2. `DELETE FROM users WHERE id = <deleteTarget>`.

If either statement fails, both roll back. A partial state where the user is deleted but their posts still reference the deleted user ID (foreign-key dangling) is architecturally impossible. If the `reassign` target does not exist, step 1 succeeds (0 rows affected) but step 2 fails on FK check — transaction rolls back.

### 5. Helena gate: security review mandatory before M4 merge

M4 is the first endpoint in NodePress that (a) accepts password material, (b) mutates authentication state, and (c) couples a delete operation with a cross-table data move. **Helena's signature on the M4 PR is required before merge.** Specifically, her review verifies:

- The `password` field is stripped before any log emission, including request body logging middleware.
- The `passwordHash` field is not present in any response shape, including error responses that echo the user object.
- The DELETE transaction boundary is correctly scoped (not split across two separate `await`s outside a transaction).
- Rate limiting on POST/PUT /users is documented as Sprint 8+ work and not silently required by the ADR. (Sprint MVP does not rate-limit; the admin Bearer token gating the endpoint provides a first-line defence.)

This matches the precedent set by ADR-018 (Bridge Security Boundary, Helena co-sign) for any surface that accepts externally-supplied material into the process.

## Alternatives Considered

### A. argon2

Winner of the Password Hashing Competition (2015). Memory-hard with tunable memory/time/parallelism cost. Modern recommendation from OWASP (2026).

**Discarded because:**

- Node binding (`argon2` package) is also a native addon. It has the same Alpine build risk as bcrypt, plus a smaller prebuilt-binary ecosystem, meaning the Alpine fallback is not trivially "install a pure-JS version" — `argon2` has no widely-used pure-JS equivalent.
- Migrating from bcrypt to argon2 is a strict upgrade path supported by our serializer — stored hashes carry their algorithm prefix, so a rehash-on-next-login can migrate users lazily. We can revisit this in Sprint 10+ if the threat model demands it without rewriting the contract.
- The marginal security benefit over bcrypt at cost 12 is not zero, but it is smaller than the marginal operational cost of debugging argon2 Alpine builds under time pressure during mini-sprint delivery.

### B. scrypt (native, via `node:crypto`)

`crypto.scrypt` ships with Node — zero dependency, no native-addon risk. Memory-hard by design.

**Discarded because:**

- The ergonomics are worse: `scrypt` returns a Buffer of raw key material. We would need to invent our own encoding format for storing `(salt, keylen, N, r, p, hash)` and our own verification function. bcrypt's `$2b$12$...` self-describing format is solved.
- No widely-known WP-compat clients or admin tools handle scrypt hashes. This is irrelevant for REST API but matters the day someone writes a `wp-cli`-equivalent tool that wants to verify passwords against a bcrypt-formatted hash (WP itself uses phpass, which accepts `$2a$` bcrypt hashes).
- The "zero dependency" advantage is narrower than it appears: we would still need a password-length/complexity validator, a constant-time-compare helper already covered by bcrypt's `compare`, and a cost-tuning test harness. Rolling our own glue code is more surface than importing bcrypt.

### C. SHA-256 with per-user salt

Fast cryptographic hash with a salt column.

**Discarded because:**

- SHA-256 is designed to be fast. On a modern GPU, it computes at ~10^10 hashes/sec. A cost-12 bcrypt operation is 10^8 times slower. Offline attack against a SHA-256 hash leak is a matter of hours for any common password; against bcrypt cost 12, it is years-to-decades.
- This alternative is listed not because any credible voice proposed it — it is listed so that if a future contributor sees the codebase and wonders "why didn't we just use SHA-256, it's in `node:crypto` for free", the answer is in this ADR and the conversation does not happen again.

## Consequences

### What changes

- New dependency in `packages/server/package.json`: `bcrypt@^5.1.1`. Spike `npm install` verified green on darwin arm64 as of 2026-04-20. Alpine/Docker verification is the responsibility of the M4 PR CI.
- New file (canonical location): `packages/server/src/services/password.ts` exporting `hash(plaintext): Promise<string>` and `verify(plaintext, storedHash): Promise<boolean>`. M4 consumes this module; all password handling flows through it.
- User serializer asserts `passwordHash` is not emitted; M4 test suite includes a negative case.
- `DELETE /wp/v2/users/:id` requires `?reassign=<userId>` and uses `db.transaction()` with two statements.
- Helena signature blocks merge of the M4 PR.

### What does not change

- `users.passwordHash` column already exists in `packages/db/src/schema/users.ts`. No migration.
- Bearer token authentication (ADR-001) is untouched. Password hashing is only exercised by create/update/delete of users, not by ordinary request auth.
- Existing endpoints (`GET /wp/v2/users`, `GET /wp/v2/users/me`) gain no new behaviour — they already did not expose the hash because the serializer never included it.

### Fallback activation (pre-agreed)

If during M4 CI on `node:20-alpine`:

```
npm ci --workspace packages/server
# → bcrypt postinstall fails with "node-pre-gyp ERR! ... no prebuilt binary for this platform"
```

…then the fallback is activated as a two-line swap, without a new ADR:

1. `packages/server/package.json`: replace `"bcrypt": "^5.1.1"` with `"bcryptjs": "^2.4.3"`.
2. `packages/server/src/services/password.ts`: replace `import bcrypt from "bcrypt"` with `import bcrypt from "bcryptjs"`.

Hash format is identical (`$2a$`/`$2b$`). No data migration, no endpoint change, no test churn beyond the one-line import.

As of 2026-04-20 (ADR authoring), the spike run on darwin arm64 yielded **bcrypt nativo build verde** — no fallback activation required at this time. If Alpine CI reports a failure during M4, the fallback engages by the mechanism above and this ADR is amended with a "Fallback activated on YYYY-MM-DD" note in the Sign-off section.

### Risks

- **Cost factor drift.** 12 is correct for 2026 hardware. A review cadence (every 18 months) is recommended to bump the factor as consumer GPUs get faster. Tracked as a recurring Sprint-close checklist item rather than a time bomb.
- **Plaintext in request logs.** The biggest non-obvious risk: Fastify's default request logger does not include bodies, but custom middleware added by a future sprint could. Mitigation: the M4 PR adds an assertion in the route hook that the `password` field is stripped from any object before it reaches the log serializer. A test harness that submits a POST with a known plaintext password and greps test log output for that plaintext gives us a regression guard.
- **bcrypt 72-byte input truncation.** bcrypt silently truncates inputs beyond 72 bytes. At password policy "min 8 chars" (M4 validation schema), this is not reachable by normal users. Document the truncation in the M4 implementation as a code comment so no one in Sprint 8 is surprised when a pathologically long password "works" after being truncated.

### Enforcement

- M4 code review (Ingrid + Carmen implement, Helena signs security): the three invariants from §2 (password never echoed, hash never serialized, conditional rotation) are verified line by line.
- M4 test suite asserts each invariant with a negative test: `expect(response.body).not.toHaveProperty("password")`, `expect(response.body).not.toHaveProperty("passwordHash")`, and a roundtrip test that a PUT without `password` leaves the DB hash byte-identical.
- Sprint 8 carry-forward: rate limiting on `POST /wp/v2/users` and `PUT /wp/v2/users/:id` (separate ADR if adopted), password policy enforcement beyond "min 8 chars" (configurable complexity — also separate ADR if adopted).

## Sign-off

- **2026-04-20 — Román (Tech Lead):** Accepted. Spike result confirmed bcrypt native build green on darwin arm64. Fallback to bcryptjs pre-approved for the Alpine/Docker path; activation does not require a new ADR.
- **2026-04-20 — Raúl (Dev Backend, spike co-executor):** Spike executed. `bcrypt@5.1.1` installed and hash+compare roundtrip verified. Documented inline above.
- **Pending — Helena (Security):** M4 PR review required before merge. Gate items enumerated in §5 above.

## References

- `packages/db/src/schema/users.ts` — `passwordHash` column already declared.
- `packages/server/src/routes/users/index.ts` — current state: only GET list + GET /me. M4 extends.
- Spike command log (2026-04-20): `npm --workspace packages/server install bcrypt@^5.1.1` → 0 build errors; roundtrip `hash → compare` returns `true`.
- ADR-001 — Bearer token authentication (separate concern from password hashing).
- ADR-014 — npm install must succeed on clean clone (drives the fallback decision).
- ADR-015 — native modules are Lane A runtime; build portability is architectural, not incidental.
- ADR-018 — precedent for Helena co-sign on security-reviewable surfaces.
- Mini-sprint scope: `.claude/memory/agents/tech-lead-roman/mini-sprint-scope.md`.
