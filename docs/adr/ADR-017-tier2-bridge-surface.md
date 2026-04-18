# ADR-017 — Tier 2 Bridge Surface

**Status:** Proposed
**Date:** 2026-04-18
**Deciders:** Román (Tech Lead), Ingrid (Lead Backend — co-sign pending implementation)
**Related:** ADR-003 (PHP Compatibility Strategy), ADR-005 (Hook System Semantics), ADR-008 (PHP-WASM Extension Matrix), ADR-018 (Bridge Security Boundary)

---

## Context

ADR-008 (Accepted, 2026-04-19) confirmed Tier 2 is viable: `@php-wasm/node@3.1.20`
exposes 44 extensions, p95 latency at 50 invocations is 2.40ms, memory is stable.
Three pilot plugins were validated for Sprint 2 integration:

- **Footnotes (MCI Footnotes)** — `[footnote]` shortcode, pure pcre + string
  logic, output HTML.
- **Shortcodes Ultimate** — UI shortcodes (buttons, tabs, boxes), pure HTML
  generation.
- **Display Posts Shortcode** — `[display-posts]`, string logic + post list
  injected from JS.

ADR-018 (Proposed) defines the **security boundary** (stubs, php.ini overrides,
stateless VM, timeouts). ADR-005 (Accepted) freezes the hook system semantics
used by every NodePress filter — including `the_content`, which is the entry
point for every post render on the REST surface.

What is missing is the **shape of the bridge itself**: how Node code invokes
PHP-WASM, what flows IN and OUT, how the bridge plugs into the existing
HookRegistry, and what the minimum PHP surface is to run the 3 pilots without
falling back to full WordPress orchestration (D-008: NodePress is a Node-native
CMS, not a WP orchestrator).

This ADR freezes that contract. Anything outside it is explicitly out of scope
and requires a subsequent ADR before code lands.

---

## Decision

The Tier 2 bridge is a **content-only, singleton, sync-in/sync-out adapter**
between the Node runtime and a single long-lived PHP-WASM instance. It is
registered as a `the_content` filter handler on the existing `HookRegistry` and
invoked once per post render.

The bridge exposes **one public entry point**, `renderShortcodes`, with a
strictly typed input and output envelope. It does not expose the PHP-WASM
instance to consumers, it does not allow arbitrary PHP evaluation, and it does
not provide a "run this plugin" surface — the only semantic operation is
"given this content and this context, return content with shortcodes expanded."

Every constraint of ADR-018 applies to this bridge by reference. This ADR does
not re-state the security contract; it defines the functional surface that
operates inside that boundary.

---

## Bridge Contract

### Entry Point

Single function, single module, single responsibility.

```ts
// packages/bridge/src/index.ts

export interface BridgeInput {
  /** Raw post content as stored in the DB. UTF-8, text or HTML. Max 1MB. */
  readonly postContent: string;
  /**
   * Minimal WP-compatible context. Only fields the 3 pilots read.
   * Additions require an ADR amendment — no silent growth.
   */
  readonly context: BridgeContext;
  /**
   * Optional invocation metadata. Populated by the caller (typically the
   * HookRegistry handler) and used for logging + timeout correlation.
   */
  readonly meta?: BridgeMeta;
}

export interface BridgeContext {
  /** Numeric post id. Mirrors `$post->ID`. */
  readonly postId: number;
  /** Post type slug ("post", "page", ...). Mirrors `$post->post_type`. */
  readonly postType: string;
  /** Post status ("publish", "draft", ...). Mirrors `$post->post_status`. */
  readonly postStatus: string;
  /**
   * Candidate posts for plugins that need a post list (Display Posts). Pre-
   * loaded by the Node side — PHP never queries the DB.
   */
  readonly candidatePosts?: readonly BridgePost[];
  /**
   * Static plugin configuration (equivalent to the subset of WP Options the
   * plugin reads at render time). Strings only, no callables, no objects.
   */
  readonly pluginConfig?: Readonly<Record<string, string>>;
}

export interface BridgePost {
  readonly id: number;
  readonly title: string;
  readonly slug: string;
  readonly excerpt: string;
  readonly url: string;
  readonly date: string; // ISO-8601
}

export interface BridgeMeta {
  /** Propagated into log entries; enables correlation with REST traces. */
  readonly traceId?: string;
  /** Per-invocation id for sandbox basedir + log correlation (ADR-018 §2). */
  readonly invocationId?: string;
}

export interface BridgeOutput {
  /** Rendered HTML. Never undefined — empty string if every shortcode bailed. */
  readonly html: string;
  /**
   * Non-fatal signals from the render. Includes every stub that fired (ADR-018
   * §6 warn-level logging), malformed shortcode attributes, and PHP notices
   * captured by log_errors. Bounded length — max 32 entries, truncated with
   * final `"... (N more)"` marker.
   */
  readonly warnings: readonly string[];
  /**
   * Populated only when the render failed end-to-end. When `error` is set,
   * `html` contains the unmodified `postContent` (fail-safe passthrough — the
   * consumer never sees a broken render).
   */
  readonly error: BridgeError | null;
}

export interface BridgeError {
  readonly code:
    | "BRIDGE_TIMEOUT" // 3s wall-clock exceeded
    | "BRIDGE_OOM" // PHP memory_limit exceeded
    | "BRIDGE_FATAL" // PHP fatal error
    | "BRIDGE_INIT_FAILED" // singleton runtime failed to boot
    | "BRIDGE_INPUT_REJECTED"; // input failed validation before PHP ran
  readonly message: string;
  /** Never contains PHP stack trace or server paths (ADR-018 Attack Surface). */
}

export function renderShortcodes(input: BridgeInput): Promise<BridgeOutput>;
```

**Why `Promise<BridgeOutput>` and not sync?** The PHP-WASM runtime exposes
`php.run(...)` as async. The bridge is therefore async at the JS layer even
though the PHP side executes synchronously. This is compatible with the way the
bridge is wired to `the_content` (see §Hook Integration below) because the
registration side pre-computes the rendered HTML before invoking the sync
filter chain — the filter itself remains synchronous, respecting ADR-005.

### Data Flow IN

What the bridge receives from Node. Fully typed, no pass-through of arbitrary
objects.

| Field                    | Type                      | Source                          | Validation at bridge boundary                       |
| ------------------------ | ------------------------- | ------------------------------- | --------------------------------------------------- |
| `postContent`            | `string` (UTF-8)          | REST handler or theme renderer  | Must be valid UTF-8; max 1MB (ADR-018)              |
| `context.postId`         | `number`                  | Post row                        | Integer ≥ 0                                         |
| `context.postType`       | `string`                  | Post row                        | Matches `^[a-z][a-z0-9_-]{0,39}$`                   |
| `context.postStatus`     | `string`                  | Post row                        | Matches `^[a-z][a-z0-9_]{0,39}$`                    |
| `context.candidatePosts` | `BridgePost[]?`           | Pre-loaded by Node (see §Stubs) | Max 100 entries; each field length-capped           |
| `context.pluginConfig`   | `Record<string, string>?` | Options API (Node-side)         | Keys match `^[a-z][a-z0-9_.-]{0,63}$`; values ≤ 8KB |
| `meta.traceId`           | `string?`                 | Caller (observability)          | UUID or opaque ≤ 64 chars                           |
| `meta.invocationId`      | `string?`                 | Bridge (generated if absent)    | UUID — drives `open_basedir` per ADR-018            |

**Input rejected before PHP runs** (returns `BridgeError.code = "BRIDGE_INPUT_REJECTED"`):

- `postContent` exceeds 1MB or is not valid UTF-8.
- `candidatePosts.length > 100`.
- Any `pluginConfig` value exceeds 8KB.
- Any key/slug fails its regex.

Rejection is fail-safe: the output carries `html = postContent` unchanged, so
the REST response is never broken by a bridge misuse.

### Data Flow OUT

What PHP returns to Node. The PHP side runs an internal convention:
`NP_BRIDGE_OUTPUT` as a JSON-encodable array written to stdout, captured by the
bridge, parsed and validated before becoming `BridgeOutput`.

PHP-side contract:

```php
// Bridge bootstrap defines:
// function np_bridge_return(string $html, array $warnings = []): void;
//
// Pilots call np_bridge_return(do_shortcode($content), np_bridge_warnings());
// The bridge captures stdout, json_decodes, validates shape.
```

Output validation at bridge boundary (after PHP returns, before JS sees it):

1. `html` is a `string`. Non-string → `BRIDGE_FATAL`, passthrough applied.
2. `warnings` is `string[]` with entries ≤ 512 chars. Truncated if length > 32.
3. No field other than `html` / `warnings` is propagated. Forward-compat: extra
   keys from future PHP versions are silently dropped.
4. Stack traces, server paths, PHP error output (captured via `log_errors`) are
   attached to `warnings`, never to `error.message` (ADR-018 § Information
   disclosure).

### Hook Integration

The bridge does not own a new primitive. It registers as **one filter handler
on the existing `the_content` hook**, reusing the HookRegistry contract frozen
in ADR-005.

```ts
// packages/bridge/src/register-bridge.ts

import type { HookRegistry, FilterEntry } from "@nodepress/core";
import { DEFAULT_HOOK_PRIORITY } from "@nodepress/core";
import { renderShortcodes } from "./index.js";

/** Stable plugin id for bulk cleanup (mirrors DEMO_PLUGIN_ID pattern). */
export const BRIDGE_PLUGIN_ID = "tier2-bridge";

/**
 * Registers the bridge as a `the_content` filter handler. The filter itself
 * is sync (ADR-005). Async PHP work is hoisted out of the filter by pre-
 * resolving the render at the REST handler layer and passing the resolved
 * HTML through the sync filter pipeline.
 *
 * Wiring strategy (see §Runtime Model):
 *
 * 1. REST handler loads the post.
 * 2. REST handler calls `await renderShortcodes({ postContent, context })`.
 * 3. REST handler calls `registry.applyFilters("the_content", output.html, ...)`.
 *    The bridge's filter entry is a passthrough in the synchronous phase — the
 *    heavy work already happened.
 *
 * The filter entry exists so that other plugins can chain before/after the
 * bridge by priority, preserving WP mental model.
 */
export function registerBridge(registry: HookRegistry): void {
  registry.removeAllByPlugin(BRIDGE_PLUGIN_ID);

  // Priority 9: runs just before the default (10) so other filters see the
  // expanded HTML. Priority is explicit so plugin authors can reason about it.
  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: BRIDGE_PLUGIN_ID,
    priority: 9,
    fn: (content) => content, // sync no-op; see §Runtime Model
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
```

**Why a no-op filter?** ADR-005 freezes filters as synchronous. PHP-WASM is
async. The bridge cannot both respect ADR-005 and execute PHP inside the filter
callback. The adopted pattern:

- The **heavy async PHP work** runs _before_ `applyFilters`, at the REST /
  theme layer.
- The **filter entry** is a stable anchor: it owns the `the_content` slot under
  a known `pluginId` and priority, so other plugins compose around it without
  racing the bridge registration.

This keeps ADR-005 intact and makes the async boundary visible at the call
site, not hidden behind a sync-looking filter.

### PHP Stubs Required

The bridge bootstrap loads a minimal WP-compatible shim layer so the 3 pilots
run unmodified. Every function listed here is **either** a real implementation
(pure string logic, no I/O) **or** a stub that returns a safe default and emits
a warning (ADR-018 § Constraints §1).

**Real implementations (content-only, no I/O):**

| Function               | Behavior                                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_shortcode`        | Registers `$tag => callable` in an in-PHP map. Lives in the singleton.                                                                                              |
| `do_shortcode`         | Parses `[tag attrs]...[/tag]` from the content string and calls the registered callable. Pure string work.                                                          |
| `shortcode_atts`       | Merges user-supplied attrs with defaults. Pure array logic.                                                                                                         |
| `shortcode_parse_atts` | Parses raw attr string into an associative array.                                                                                                                   |
| `esc_html`             | `htmlspecialchars` with WP flags.                                                                                                                                   |
| `esc_attr`             | `htmlspecialchars` for attribute context.                                                                                                                           |
| `esc_url`              | URL-safe filtering (no network lookup).                                                                                                                             |
| `sanitize_text_field`  | Strip tags + collapse whitespace, per WP reference impl.                                                                                                            |
| `wp_kses_post`         | **Stub MVP:** returns input unchanged, emits warning. Full implementation is out of scope — consumer is expected to sanitize the bridge output at the render layer. |
| `apply_filters`        | Dispatches against a PHP-local filter map populated by `add_filter`. Does NOT cross back to the Node HookRegistry in v1 (see §Out of Scope).                        |
| `add_filter`           | Registers a PHP-local filter.                                                                                                                                       |
| `__` / `_e` / `_x`     | Identity (no i18n in v1 — intl extension absent per ADR-008).                                                                                                       |

**Stubs (ADR-018 §Constraints §1, return safe defaults, emit warn log):**

| Function                                                              | Returns                                                                                                                                                        | Reason                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `wp_mail`                                                             | `false`                                                                                                                                                        | Email exfiltration vector (ADR-018).                |
| `wp_remote_get`                                                       | `WP_Error`                                                                                                                                                     | Network I/O forbidden in Tier 2.                    |
| `wp_remote_post`                                                      | `WP_Error`                                                                                                                                                     | Network I/O forbidden.                              |
| `wp_remote_request`                                                   | `WP_Error`                                                                                                                                                     | Network I/O forbidden.                              |
| `curl_exec`                                                           | `false`                                                                                                                                                        | Sync cURL blocks the event loop (ADR-018 R1).       |
| `curl_multi_exec`                                                     | `CURLM_OK` (no-op)                                                                                                                                             | Same as `curl_exec`.                                |
| `file_put_contents`                                                   | `false`                                                                                                                                                        | FS writes forbidden.                                |
| `fwrite`                                                              | `0`                                                                                                                                                            | FS writes forbidden.                                |
| `mail`                                                                | `false`                                                                                                                                                        | Email exfiltration.                                 |
| `exec` / `system` / `shell_exec` / `passthru` / `popen` / `proc_open` | `""`                                                                                                                                                           | RCE vectors. Also in `disable_functions` (ADR-018). |
| `$wpdb->*`                                                            | `WP_Error`                                                                                                                                                     | DB access forbidden permanently (D-008).            |
| `get_post` (by id)                                                    | Mock backed by `context.candidatePosts` if id matches, else `null`. Enables Display Posts Shortcode without DB access.                                         |
| `get_posts`                                                           | Returns `context.candidatePosts` (already filtered by Node). Ignores PHP-side query args beyond trivial filters. Emits a warning when ignored args are passed. |
| `get_option`                                                          | Reads from `context.pluginConfig`; returns `false` if missing.                                                                                                 |
| `update_option`                                                       | No-op returning `true`; emits warning. Write intent is lost — documented in consumer plugin evaluation.                                                        |
| `get_post_meta`                                                       | Reads from `context.candidatePosts[i].meta` if present, else `""`.                                                                                             |
| `do_action`                                                           | PHP-local only. Does NOT cross to Node HookRegistry in v1.                                                                                                     |

**The crossed-out boundary is intentional.** `apply_filters` and `do_action` on
the PHP side do NOT call back into the Node `HookRegistry`. Cross-runtime hook
dispatch is a separate ADR (listed in Out of Scope). In v1 the bridge is a
one-way call: Node → PHP → HTML string → Node.

### Runtime Model

**One PHP-WASM instance per Node process.** Singleton, lazy-initialized on first
`renderShortcodes` call, kept alive for the process lifetime.

```ts
// packages/bridge/src/runtime.ts

let runtime: PhpRuntime | null = null;

async function getRuntime(): Promise<PhpRuntime> {
  if (runtime !== null) return runtime;
  runtime = await bootPhpRuntime({
    /* ADR-018 php.ini overrides */
  });
  return runtime;
}
```

Rationale (from spike day 3, documented in ADR-008 empirical results):

- Boot cost of a fresh PHP-WASM instance is the dominant latency. Reusing the
  instance keeps p95 at 2.40ms; a per-request instance would push p95 into the
  hundreds of ms.
- Memory is stable across 50 invocations (-2.69MB net delta). No detectable
  leak in the spike window. Long-running reuse is empirically safe for
  Sprint 2.
- Stateless-between-invocations is preserved by **scope reset**, not by
  re-boot. Before each `php.run`, the bridge calls a bootstrap reset function
  (`np_bridge_reset_scope`) that clears PHP-local state: unregisters all
  shortcodes registered by the previous invocation, truncates PHP-local
  filter/action maps, clears warnings buffer, resets superglobals. The PHP
  VM itself is not re-booted.
- This is the pattern ADR-018 §Attack Surface "Plugin cross-contamination"
  allows: scope reset, stateless semantics, no shared PHP globals across
  plugin invocations.

**Concurrency:** the singleton is **serialized** via an internal mutex. Two
concurrent Node requests do NOT enter `php.run` in parallel — they queue. This
is acceptable for Sprint 2 because:

- The 3 pilots render in <10ms each (ADR-008 benchmark).
- Piloto load is low (early adopters, staging).
- Worker-thread isolation (one PHP-WASM per worker) is the documented path to
  production concurrency, listed in Out of Scope here and in ADR-018 R2.

**Timeout contract (ADR-018 R3):**

```ts
// Inside renderShortcodes:
const result = await Promise.race([
  php.run(bridgeBootstrapCode, { inputJson }),
  timeout(3000), // 3s wall-clock
]);
```

- Hard timeout: **3 seconds wall-clock**, enforced by the JS wrapper.
- Soft timeout: `max_execution_time = 2s` in php.ini (ADR-018 §2) — gives PHP
  a chance to raise a catchable error first.
- On timeout: `BridgeError.code = "BRIDGE_TIMEOUT"`, `html = input.postContent`
  (passthrough), `warnings` includes plugin-id of the running invocation if
  known.
- Timeout does NOT kill the runtime. The mutex releases, the scope is reset on
  next call.

**Failure modes documented:**

| Mode                    | Behavior                                                                    |
| ----------------------- | --------------------------------------------------------------------------- |
| Timeout (3s)            | `BRIDGE_TIMEOUT`, passthrough html, warn logged                             |
| OOM (PHP memory_limit)  | `BRIDGE_OOM`, passthrough, warn logged                                      |
| PHP fatal               | `BRIDGE_FATAL`, passthrough, warn logged                                    |
| Runtime boot failure    | `BRIDGE_INIT_FAILED`, passthrough, runtime remains null (retried next call) |
| Input validation failed | `BRIDGE_INPUT_REJECTED`, passthrough, no PHP executed                       |

---

## Consequences

### What this locks in

1. **One bridge, one entry point, one surface.** `renderShortcodes` is the
   only way Node code talks to PHP. No escape hatches for "advanced"
   consumers. Violations block PR review.

2. **The bridge is an async boundary visible at the call site.** Any code path
   that wants shortcode expansion calls `await renderShortcodes(...)`
   explicitly. No magical async-inside-sync filter tricks. ADR-005 intact.

3. **The PHP surface is closed.** The stub list in §PHP Stubs Required is the
   complete set of WP functions the bridge exposes. Any new plugin that needs
   an additional function requires amending this ADR and the stub test suite
   (90% coverage gate from ADR-018 §Consequences #2).

4. **The singleton is an architectural commitment, not a convenience.** Moving
   to per-request or per-worker-thread isolation is a breaking change to the
   runtime model and requires a new ADR.

5. **`BridgeOutput` is the sole return shape.** Nothing else crosses the
   boundary. Streaming, chunked rendering, partial results — all out of scope.

### Positive

- Minimal surface → minimal threat model → ADR-018 applies cleanly.
- Singleton + scope reset matches empirical behavior from spike day 3 — no
  speculative design.
- Sync-filter + pre-resolved-html pattern preserves ADR-005 without exception
  and without hiding the async boundary.
- Fail-safe on every error path: the consumer never gets a broken render, only
  the original `postContent` plus a typed error code.

### Negative

- Serialized execution through the singleton caps throughput. Documented;
  gated behind "Sprint 2 piloto load" assumption. Worker-thread concurrency is
  future work and will require benchmark re-run.
- Pre-resolving the render outside the filter pipeline means plugins that want
  to filter the **raw** content before shortcode expansion must register at
  priority < 9, and plugins that want to filter the expanded HTML register at
  priority > 9. This is documented convention, not language-enforced — a lint
  rule is a candidate for Sprint 3.
- Stub coverage of WP API is small. The 3 pilots run; the 4th piloto is not
  guaranteed. Each new candidate plugin requires a viability sprint (ADR-008
  criteria) and potentially an ADR amendment here.

---

## Out of Scope

This ADR explicitly does NOT cover:

1. **Cross-runtime hook dispatch** (PHP `apply_filters` or `do_action` calling
   back into the Node `HookRegistry`). The double-crossing bridge is a design
   option documented in earlier meet notes; implementation requires a separate
   ADR. In v1 the bridge is one-way.

2. **`$wpdb` and real DB access from PHP.** Permanently rejected (D-008).

3. **HTTP from PHP** (cURL, `wp_remote_*`, `file_get_contents(url)`). Stubbed
   per ADR-018. A future async-wrapper ADR would reopen this; not now.

4. **Filesystem writes from PHP.** Blocked at php.ini level (ADR-018).

5. **Per-request or per-worker-thread PHP-WASM isolation.** Documented as
   future work. Requires new ADR + benchmark.

6. **Streaming or chunked bridge output.** `BridgeOutput.html` is a single
   string. No partial rendering.

7. **Admin-panel bridge invocation** (editor-side preview that calls
   `renderShortcodes` synchronously on keystroke). Debouncing and caching at
   the admin layer are a separate UX concern, not a bridge contract change.

8. **Bridge observability** (per-invocation spans, latency histograms,
   per-plugin metrics). ADR-018 §6 requires baseline logging; detailed tracing
   is covered by the pending ADR Bridge Observability (Sprint 2 week 1).

9. **WP i18n layer** (`gettext`, `.mo` files, locale formatting). `intl`
   extension is absent (ADR-008). Identity stubs in v1; full i18n is a
   separate ADR if demand justifies it.

10. **New pilot plugins beyond Footnotes, Shortcodes Ultimate, Display Posts.**
    Each new candidate requires viability assessment (ADR-008 criteria) and
    may require an amendment to §PHP Stubs Required.

---

## Sign-off

- **Román (Tech Lead) — author.** Status: Proposed on commit date.
- **Ingrid (Lead Backend) — co-sign pending.** Transitions to `Accepted` once
  the bridge is implemented and the 3 pilots pass their integration tests.
  Same gate pattern as ADR-014 and ADR-016 — no certification before the
  contract runs clean once.

---

## References

- ADR-003: PHP Compatibility Strategy (Tier 2 definition)
- ADR-005: Hook System Semantics (sync filters, async actions — frozen)
- ADR-008: PHP-WASM Extension Matrix (44 extensions, benchmark, 3 pilots)
- ADR-018: Bridge Security Boundary (stubs, php.ini, timeouts, logging)
- D-008: NodePress = CMS nativo Node, NO orquestador WP
- `packages/core/src/hooks/types.ts` — frozen HookRegistry contract
- `packages/server/src/demo/register-demo-hooks.ts` — reference pattern for
  plugin-id-scoped filter registration
- `@php-wasm/node@3.1.20` — runtime (ADR-008)
- Spike #25 day 3 findings: `docs/spikes/2026-04-19-day3-phpwasm.md`
