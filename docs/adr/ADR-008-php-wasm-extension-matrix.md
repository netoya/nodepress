# ADR-008: PHP-WASM Extension Matrix — Tier 2 Plugin Viability

- **Status:** Proposed — **Revised 2026-04-18 with empirical data from spike day 2**
- **Date:** 2026-04-17
- **Revised:** 2026-04-18
- **Author:** Helena (IT Manager)
- **Related:** ADR-003 (PHP Compatibility Strategy), Spike #25 (Raúl, day 1 + day 2)

> **Revision note (2026-04-18):** Initial extension inventory (day 1) was based on agent knowledge base and underestimated bundle coverage significantly. Day 2 empirical validation via `get_loaded_extensions()` found **44 extensions** — vs. the ~20–21 estimated. Six extensions previously marked NOT Available are in fact present. Viability classification updated accordingly. See lesson learned at end of document.

---

## Context

ADR-003 §Tier 2 establishes that PHP plugins executing pure content logic (shortcodes, text filters) may run via `@php-wasm/node`. That tier's viability depends entirely on which PHP extensions are available in the WASM bundle.

Without a formal extension matrix, Raúl cannot make a principled decision about which plugin to use in the day 2 POC, and the team cannot define a defensible acceptance criterion for Tier 2.

This ADR formalizes: (1) the available extension inventory, (2) the missing extensions required by popular WP plugins, and (3) a viability classification for Tier 2 plugin selection.

---

## Extension Inventory — `@php-wasm/node@3.1.20`

> **Source:** Empirical — `get_loaded_extensions()` executed in spike day 2 runner (`packages/spike-phpwasm/src/runner.ts`). Total: **44 extensions**. Full flat list pending spike day 3 output capture; entries below are confirmed from day 2 findings doc.

### Available Extensions (bundled — confirmed day 2)

| Extension | Category | Typical Use Case | Status |
|---|---|---|---|
| Core | Runtime | PHP core engine | Confirmed day 2 |
| date | Time | `date()`, `strtotime()`, `DateTime` | Confirmed day 2 |
| pcre | Regex | `preg_match`, `preg_replace` | Confirmed day 2 |
| mbstring | String | Multi-byte string functions | Confirmed day 2 |
| hash | Crypto | `md5()`, `sha1()`, `hash()` | Confirmed day 2 |
| filter | Validation | `filter_var()`, input sanitization | Confirmed day 2 |
| json | Serialization | `json_encode` / `json_decode` | Confirmed day 2 |
| ctype | String | `ctype_alpha()`, character class checks | Confirmed day 2 |
| tokenizer | Parse | PHP source tokenization | Confirmed day 2 |
| SPL | Data Structures | SplStack, SplQueue, iterators | Confirmed day 2 |
| SQLite3 | Database | Embedded DB | Confirmed day 2 |
| PDO | Database | PHP Data Objects base | **SURPRISE — was NOT Available in day 1** |
| pdo_sqlite | Database | PDO adapter for SQLite | Confirmed day 2 |
| pdo_mysql | Database | PDO adapter for MySQL | **SURPRISE — was NOT Available in day 1** |
| mysqli | Database | MySQL improved connector | **SURPRISE — was NOT Available in day 1** |
| OpenSSL | Crypto | Hash, encrypt, JWT, HTTPS verification | Confirmed day 2 |
| cURL | Network | HTTP client, API calls | **SURPRISE — was NOT Available in day 1** |
| soap | Web Services | SOAP client/server | **SURPRISE — was NOT Available in day 1** |
| GD | Graphics | Image resize, manipulation | **SURPRISE — was NOT Available in day 1** |
| imagick | Graphics | Advanced image processing (ImageMagick) | **SURPRISE — was NOT Available in day 1** |
| dom | XML | DOM tree manipulation | Confirmed day 2 |
| libxml | XML | libxml2 bindings | Confirmed day 2 |
| SimpleXML | XML | Simple XML parsing | Confirmed day 2 |
| xml | XML | XML parser functions | Confirmed day 2 |
| xmlreader | XML | Pull-style XML parser | Confirmed day 2 |
| xmlwriter | XML | XML stream writer | Confirmed day 2 |
| Libzip / zip | Archive | ZIP creation/reading | Confirmed day 2 |
| Libpng | Graphics (decode) | PNG decode | Confirmed day 2 |

> **Note:** Day 2 spike confirmed 44 total extensions. The complete alphabetical list (all 44) is pending capture in spike day 3 benchmark output. Entries above are those confirmed by name in `docs/spikes/2026-04-18-day2-phpwasm.md`. Do not treat gaps as absences.

### NOT Available (absent from WASM bundle — updated day 2)

| Extension | Category | WP Plugins that Require It | Impact |
|---|---|---|---|
| intl / ICU | Localization | WPML, Polylang, TranslatePress | i18n-heavy plugins lose locale formatting |
| redis / memcached | Cache | Redis Object Cache, W3 Total Cache | Object cache backends unavailable |
| opcache | Performance | Universal (performance) | No persistent bytecode cache across requests |
| mcrypt | Crypto (legacy) | Legacy encryption plugins | Deprecated; most modern plugins use OpenSSL |
| PECL extensions (misc) | Various | Specific plugin dependencies | Evaluated case by case |

> **Removed from NOT Available (now confirmed present):** cURL, GD, Imagick, PDO, PDO_MySQL, mysqli, SOAP, dom, libxml, SimpleXML, xml, xmlreader, xmlwriter.

---

## Plugin Viability Classification — Tier 2

Criteria for each tier:

- **Viable:** Requires only bundled extensions. No network I/O. No `$wpdb`. No filesystem writes. Shortcode or filter logic only.
- **Marginal:** One or two missing features; JS-side mock or fallback is feasible within a sprint. No architectural blockers.
- **Inviable:** Hard dependency on opcache persistence, persistent filesystem writes, or features with no WASM equivalent. Cannot run in WASM sandbox without rewriting the plugin.

### Viable Plugins (✅ — Tier 2 candidates)

| Plugin | Size | What it does | Why viable |
|---|---|---|---|
| **Shortcodes Ultimate** | ~300KB | UI shortcodes (buttons, tabs, boxes) | Pure HTML output, no network, no DB |
| **bbPress shortcodes** (content-only subset) | Small | Forum stats display via shortcode | String interpolation, core functions only |
| **Simple Custom CSS** | Tiny | Injects custom CSS via shortcode | Output-only, no deps |
| **Footnotes** (MCI Footnotes) | ~50KB | Adds footnote shortcodes to post content | String parsing with pcre, output only |
| **Display Posts Shortcode** | ~80KB | `[display-posts]` renders post list | Can be mocked with JS-provided post data via bridge |
| **Shortcode Factory** (generic) | Tiny | Registers custom shortcodes with templates | Pure string, mbstring, pcre |
| **Advanced Iframe** | ~100KB | Embeds iframes via shortcode | Output-only HTML generation |
| **TablePress** | ~200KB | Renders data tables from stored JSON | Table data from `wp_posts` JSON — bridgeable via `get_post_meta`; rendering is pure PHP string logic. GD/CSV parsing no longer blockers. | 

### Marginal Plugins (⚠️ — needs adaptation)

| Plugin | What blocks it | Feasible workaround |
|---|---|---|
| **Contact Form 7** | `wp_mail()` / SMTP for email sending. cURL now present, but SMTP transport has no WASM socket equivalent. | Mock `wp_mail()` in JS bridge; render form only, no send. cURL-based HTTP submission to a JS endpoint is now feasible. |
| **WP-Polls** | Reads/writes vote counts via `$wpdb` | Bridge `get_option` / `update_option` to JS store; no raw SQL needed if plugin respects WP Options API |
| **Gravity Forms** (display only) | Form submission persistence — PDO now present, but no real DB behind it in WASM sandbox | Render form HTML only; intercept submission at JS layer. PDO with SQLite backing is now a viable in-WASM store option. |
| **Yet Another Related Posts Plugin** | DB queries for related posts | Feed candidate posts from JS; plugin scores/ranks them (pure logic) |
| **Yoast SEO** (meta tags only) | cURL for API pings + XML sitemap generation. cURL present but network I/O blocks event loop. | Disable ping/API features; meta tag output is pure PHP string logic. Sitemap generation remains inviable without FS. |
| **Akismet** | cURL to Akismet API — cURL present, but call is synchronous and blocks event loop | Could work with JS async wrapper intercepting cURL calls; complex bridge required. Marginal. |
| **WooCommerce basic display** (no checkout) | Checkout requires payment gateway cURL + PDO persistence. Display-only subset is feasible. PDO now present for read queries against SQLite-backed mock DB. | Product catalog display, cart UI render — viable with PDO+SQLite mock. Payment flow remains inviable. |

### Inviable Plugins (❌ — cannot run in Tier 2)

| Plugin | Hard blocker | Notes |
|---|---|---|
| **WooCommerce full checkout** | Synchronous cURL to payment gateways (blocks Node.js event loop) + persistent filesystem for order state | Display/catalog subset promoted to ⚠️. Full checkout flow remains ❌. |
| **Advanced Custom Fields (ACF)** | `$wpdb` EAV schema reads at scale — PDO now present, but ACF's schema requires real relational DB, not SQLite mock | Re-evaluate in Sprint 2 with PDO+SQLite bridge prototype |
| **NextGEN Gallery** | GD/Imagick now present, but requires persistent filesystem for thumbnail storage | FS writes remain blocked in WASM sandbox |
| **WP Rocket** | Filesystem writes, opcache persistence | Cache plugins require FS access by definition |
| **UpdraftPlus** | Filesystem, cURL (cloud storage), zip | Backup plugin; FS writes blocked |
| **Mailchimp for WP** | cURL to Mailchimp API — cURL present but synchronous, blocks event loop; no async adapter | Marginal only if JS intercept layer wraps cURL as async |
| **WPML** | intl/ICU absent, DB meta table schema extensions | intl remains the hard blocker |
| **WP All Import** | libxml now present; PDO now present; but filesystem writes for import staging remain blocked | libxml + PDO availability reduces blockers — re-evaluate Sprint 2 |

---

## Recommended POC Plugin

### Day 3 Benchmark — Primary Recommendation (unchanged)

**Recommendation: `Footnotes` (MCI Footnotes) or bespoke `[hello-nodepress]`.**

Rationale:

1. **Footnotes** is ~50KB, no build system, pure PHP shortcode logic using only `preg_replace` (pcre, available) and string functions. Output is HTML. Zero network, zero DB, zero filesystem.
2. If Footnotes has any dependency issue: write a 20-line bespoke test plugin `[hello-nodepress]` that registers one shortcode returning a string built with `date()`, `hash()`, and `strtoupper()` — all bundled. This is unambiguously viable and validates the entire WASM bridge stack.
3. **Isolation is the objective for day 3 benchmark**: latency × 50 invocations, memory profiling. A complex plugin introduces confounding variables.

**Acceptance gate for day 3:** warm latency stable <8ms at 50 invocations, memory baseline documented.

### Sprint 2+ — Second Recommendation (new)

**Recommendation: A cURL/GD-exercising plugin from the ⚠️ tier — suggested: Contact Form 7 (form render + HTTP submission mock) or a bespoke `[fetch-nodepress]` shortcode.**

Rationale:

1. Day 2 confirmed cURL and GD are present. They have NOT been tested end-to-end — only their presence via `get_loaded_extensions()` is confirmed.
2. Sprint 2 must validate: does cURL in WASM make real HTTP calls? Does it block the Node.js event loop (as suspected)? Can GD resize an image correctly?
3. Contact Form 7 form rendering + simulated HTTP POST via cURL to a local test endpoint covers both extension families in a real plugin context.
4. Alternative: bespoke `[fetch-nodepress]` shortcode that makes a `curl_exec()` call to `http://localhost` — controlled, measurable, isolated.

**Acceptance gate for Sprint 2 cURL test:** HTTP response received within WASM sandbox, event loop not blocked (async wrapper or dedicated worker thread confirmed).

---

## Decision

**Formalized viability criterion for Tier 2 (updated):**

> A PHP plugin is eligible for Tier 2 (php-wasm) if and only if:
> 1. It requires no PHP extension outside the confirmed bundled set (see table above — 44 extensions as of `@php-wasm/node@3.1.20`).
> 2. Network calls via cURL are acceptable only if wrapped in an async JS adapter (synchronous cURL blocks the Node.js event loop — not production-safe without mitigation).
> 3. It does not issue raw `$wpdb` queries against a real relational DB (WP Options API is bridgeable; PDO+SQLite in-WASM mock is now a feasible pattern for read-heavy logic).
> 4. It does not write to the filesystem.
> 5. Its execution time per shortcode invocation is bounded (no loops proportional to post count or user count without a JS-provided data ceiling).

---

## Alternatives Considered and Discarded

### Compile missing extensions to WASM

Build custom WASM builds of cURL (via emscripten), GD, Imagick, and PDO_MySQL and bundle them with NodePress.

**Discarded.**

- Engineering effort: 3–6 weeks per extension, not including maintenance.
- cURL compiled to WASM loses its primary capability (real network I/O) because WASM has no socket primitives — only Fetch API via JavaScript bridge. The compiled extension would need a full reimplementation of its transport layer.
- GD and Imagick in WASM have known size penalties (+15–40MB per extension) and performance degradation (2–5x slower than native).
- Every upstream PHP or OpenSSL update requires a rebuild. Becomes a permanent CVE maintenance burden with no upstream to absorb it.
- Ratio: effort x10, value marginal. Moot for cURL, GD, Imagick, PDO — all now present in upstream bundle.

---

## Consequences

### Estimated Tier 2 plugin coverage (revised)

| Category | Estimated % of WP plugin directory | Change from day 1 |
|---|---|---|
| Inviable (FS writes / opcache / persistent state) | ~50% | Down from ~70% |
| Marginal (bridgeable with JS mocks or async wrappers) | ~25% | Up from ~15% |
| Viable (pure content logic, confirmed extensions) | ~25% | Up from ~15% |

> **Revision note:** cURL, GD, PDO presence materially expands the marginal and viable buckets. The 50% inviable category is now dominated by FS-write requirements and synchronous-network blockers, not missing extensions. These numbers are estimates pending Sprint 2 end-to-end tests.

### Positive

- Clear acceptance gate prevents wasted spike time on inviable plugins.
- Extension inventory is now empirically grounded, not estimated.
- The viable + marginal ~50% covers a much broader content-site use case than initially modeled.
- PDO+SQLite pattern opens a bridging path for DB-read plugins without a real MySQL instance.

### Negative

- cURL in WASM is synchronous — blocks Node.js event loop. Every plugin using `wp_remote_get` / `curl_exec` requires an async wrapper strategy before it is production-safe. This is a new constraint not present in the day 1 model.
- "Marginal" category still requires per-plugin bridge work. Each entry needs a dedicated assessment sprint.
- Full extension list (all 44) not yet captured in flat form — pending day 3. Some extensions may behave differently in WASM context than in native PHP (e.g., cURL network, imagick FS reads).

### Open Questions for Raúl Day 3

1. Does `preg_replace` (pcre) perform correctly for multibyte content at 50 invocations?
2. Does `date()` / `DateTime` respect the JS process timezone or default to UTC?
3. What is actual memory overhead per WASM PHP instance with a 50KB plugin loaded?
4. Does cURL make real outbound HTTP calls, or does WASM sandbox intercept them silently?
5. Is imagick functional for resize, or does it fail silently when accessing FS for input images?

---

## Lesson Learned

> **Knowledge-base estimation of WASM extension availability was significantly undercounted.** The day 1 inventory predicted ~20–21 extensions; empirical validation found 44. Six extensions marked NOT Available (cURL, GD, Imagick, PDO, PDO_MySQL, mysqli, SOAP) are present in the actual package. **Future ADRs dealing with runtime or package capabilities must include a mandatory empirical validation step BEFORE finalizing the extension matrix.** Do not rely on documentation, changelogs, or agent knowledge base alone for capability inventories — run `get_loaded_extensions()` (or equivalent) first.

---

## References

- ADR-003: PHP Compatibility Strategy (Román, 2026-04-09)
- Spike #25 day 1 findings: `docs/spikes/2026-04-17-day1-phpwasm.md`
- Spike #25 day 2 findings: `docs/spikes/2026-04-18-day2-phpwasm.md`
- Day 2 runner (empirical extension list): `packages/spike-phpwasm/src/runner.ts`
- `@php-wasm/node@3.1.20` — [@php-wasm/node NPM](https://www.npmjs.com/package/@php-wasm/node)
- WordPress Playground GitHub: [WordPress/wordpress-playground](https://github.com/WordPress/wordpress-playground)
- WP Plugin Directory: [wordpress.org/plugins](https://wordpress.org/plugins/)
