# ADR-008: PHP-WASM Extension Matrix — Tier 2 Plugin Viability

- **Status:** Proposed
- **Date:** 2026-04-17
- **Author:** Helena (IT Manager)
- **Related:** ADR-003 (PHP Compatibility Strategy), Spike #25 (Raúl, day 1)

> **Source note:** Extension inventory based on agent knowledge base + Raúl's day 1 spike findings (`@php-wasm/node@3.1.20`). Pending validation against live package in day 2. Flag any discrepancy to Helena.

---

## Context

ADR-003 §Tier 2 establishes that PHP plugins executing pure content logic (shortcodes, text filters) may run via `@php-wasm/node`. That tier's viability depends entirely on which PHP extensions are available in the WASM bundle.

Without a formal extension matrix, Raúl cannot make a principled decision about which plugin to use in the day 2 POC, and the team cannot define a defensible acceptance criterion for Tier 2.

This ADR formalizes: (1) the available extension inventory, (2) the missing extensions required by popular WP plugins, and (3) a viability classification for Tier 2 plugin selection.

---

## Extension Inventory — `@php-wasm/node@3.1.20`

### Available Extensions (bundled)

| Extension | Category | Typical Use Case | Type |
|---|---|---|---|
| SQLite | Database | Embedded DB, SQLite object cache | Bundled |
| Libzip / zip | Archive | ZIP creation/reading, plugin installs | Bundled |
| Libpng | Graphics (read-only) | PNG decode (no manipulation) | Bundled |
| OpenSSL | Crypto | Hash, encrypt, JWT, HTTPS verification | Bundled |
| MySQL (ext/mysql) | Database | Legacy MySQL connector (not PDO) | Bundled |
| CLI / SAPI | Runtime | CLI script execution context | Core |
| JSON | Serialization | `json_encode` / `json_decode` | Core |
| mbstring | String | Multi-byte string functions | Core |
| pcre | Regex | `preg_match`, `preg_replace` | Core |
| SPL | Data Structures | SplStack, SplQueue, iterators | Core |
| date | Time | `date()`, `strtotime()`, `DateTime` | Core |
| hash | Crypto | `md5()`, `sha1()`, `hash()` | Core |
| filter | Validation | `filter_var()`, input sanitization | Core |
| ctype | String | `ctype_alpha()`, character class checks | Core |
| tokenizer | Parse | PHP source tokenization | Core |

### NOT Available (absent from WASM bundle)

| Extension | Category | WP Plugins that Require It | Impact |
|---|---|---|---|
| cURL / ext-curl | Network | Contact Form 7 (SMTP), Yoast SEO (API calls), WooCommerce (payment gateways), Mailchimp for WP, Akismet | Any plugin that makes HTTP calls to external APIs fails completely |
| GD | Graphics | NextGEN Gallery, Regenerate Thumbnails, WP Smush, ShortPixel, any image resize on upload | Image generation and manipulation fully blocked |
| Imagick / ImageMagick | Graphics | TimThumb, Imsanity, EWWW Image Optimizer | Alternative to GD; same outcome |
| PDO / PDO_MySQL | Database | Gravity Forms, WooCommerce, ACF (Advanced Custom Fields) | Most DB-heavy plugins use PDO — ext/mysql alone insufficient |
| intl / ICU | Localization | WPML, Polylang, TranslatePress | i18n-heavy plugins lose locale formatting |
| xml / libxml / SimpleXML | XML | WP All Import, WXR importers, RSS feed parsers | XML parsing broken (fast-xml-parser in JS is workaround candidate) |
| soap | Web Services | WooCommerce (some payment providers), shipping integrations | SOAP-based integrations fail |
| redis / memcached | Cache | Redis Object Cache, W3 Total Cache | Object cache backends unavailable |
| opcache | Performance | Universal (performance) | No persistent bytecode cache |

---

## Plugin Viability Classification — Tier 2

Criteria for each tier:

- **Viable:** Requires only bundled extensions. No network I/O. No `$wpdb`. No filesystem writes. Shortcode or filter logic only.
- **Marginal:** One or two missing features; JS-side mock or fallback is feasible within a sprint. No architectural blockers.
- **Inviable:** Hard dependency on cURL, GD, Imagick, PDO, or persistent filesystem. Cannot run in WASM sandbox without rewriting the plugin.

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

### Marginal Plugins (⚠️ — needs adaptation)

| Plugin | What blocks it | Feasible workaround |
|---|---|---|
| **Contact Form 7** (form rendering only) | SMTP via cURL for email sending | Mock `wp_mail()` in JS bridge; render only, no send |
| **WP-Polls** | Reads/writes vote counts via `$wpdb` | Bridge `get_option` / `update_option` to JS store; no raw SQL needed if plugin respects WP Options API |
| **Gravity Forms** (display only) | Form submission uses PDO + cURL | Render form HTML only; intercept submission at JS layer |
| **TablePress** | Reads table data from `wp_posts` serialized JSON | Bridge `get_post_meta` to JS post store; table rendering is pure PHP string logic |
| **Yet Another Related Posts Plugin** | DB queries for related posts | Feed candidate posts from JS; plugin scores/ranks them (pure logic) |

### Inviable Plugins (❌ — cannot run in Tier 2)

| Plugin | Hard blocker | Notes |
|---|---|---|
| **WooCommerce** | PDO MySQL, cURL (payment APIs), GD (product images) | Every layer blocked |
| **Yoast SEO** | cURL (API pings, sitemaps), XML sitemaps | Network-dependent |
| **Advanced Custom Fields (ACF)** | PDO for field schema, `$wpdb` EAV reads | DB-first architecture |
| **NextGEN Gallery** | GD / Imagick for thumbnails | Image processing is core function |
| **WP Rocket** | Filesystem writes, opcache | Cache plugins require FS access by definition |
| **Akismet** | cURL to Akismet API | Spam check is remote call; no offline fallback |
| **UpdraftPlus** | Filesystem, cURL (cloud storage), zip | Backup plugin, all features blocked |
| **Mailchimp for WP** | cURL to Mailchimp API | Pure network plugin |
| **WPML** | intl/ICU, DB meta tables | Locale engine + DB schema extensions |
| **WP All Import** | libxml, PDO, filesystem | XML importer, every dependency missing |

---

## Recommended POC Plugin for Raúl — Day 2

**Recommendation: `Footnotes` (MCI Footnotes) or a bespoke minimal shortcode plugin.**

Rationale:

1. **Footnotes** is ~50KB, no build system, pure PHP shortcode logic using only `preg_replace` (pcre, available) and string functions. Output is HTML. Zero network, zero DB, zero filesystem.
2. If Footnotes has any dependency issue: write a 20-line bespoke test plugin `[hello-nodepress]` that registers one shortcode returning a string built with `date()`, `hash()`, and `strtoupper()` — all bundled. This is unambiguously viable and validates the entire WASM bridge stack.
3. Do NOT use Contact Form 7 for day 2 POC — it will hit `wp_mail()` / cURL on form submission and produce a confusing partial failure.

**Acceptance gate for Raúl day 2:** `[footnote]text[/footnote]` rendered correctly in NodePress response, latency < 20ms.

---

## Decision

**Formalized viability criterion for Tier 2:**

> A PHP plugin is eligible for Tier 2 (php-wasm) if and only if:
> 1. It requires no PHP extension outside the bundled set (see table above).
> 2. It makes no network calls (no cURL, no `wp_remote_get`, no SMTP).
> 3. It does not issue raw `$wpdb` queries (WP Options API is bridgeable; raw SQL is not).
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
- Ratio: effort x10, value marginal. Not viable.

---

## Consequences

### Estimated Tier 2 plugin coverage

| Category | Estimated % of WP plugin directory |
|---|---|
| Inviable (cURL / GD / PDO / FS) | ~70% |
| Marginal (bridgeable with JS mocks) | ~15% |
| Viable (pure content logic) | ~15% |

**The viable 15% is NodePress Tier 2's real ICP:** shortcode-driven content plugins, text transformation filters, simple display widgets. This is sufficient for blog and content-site use cases — which aligns with ADR-003 positioning.

### Positive

- Clear acceptance gate prevents wasted spike time on inviable plugins.
- The 15% viable category covers the majority of plugins used on personal and editorial sites (volume-wise), even if not on enterprise WooCommerce stores.
- Constraint is documented — no team member will propose WooCommerce Tier 2 without a data-backed counter-argument.

### Negative

- ~70% of plugins by count are inviable in Tier 2. Any marketing claim about PHP compatibility must be scoped carefully.
- "Marginal" category requires per-plugin bridge work — it is not a general mechanism. Each plugin in that bucket needs a dedicated assessment sprint.

### Open Questions for Raúl Day 2

1. Does `preg_replace` (pcre) perform correctly in the WASM build for multibyte content?
2. Does `date()` / `DateTime` respect the JS process timezone or default to UTC?
3. What is actual memory overhead per WASM PHP instance with a 50KB plugin loaded?

---

## References

- ADR-003: PHP Compatibility Strategy (Román, 2026-04-09)
- Spike #25 day 1 findings: `docs/spikes/2026-04-17-day1-phpwasm.md`
- `@php-wasm/node@3.1.20` — [@php-wasm/node NPM](https://www.npmjs.com/package/@php-wasm/node)
- WordPress Playground GitHub: [WordPress/wordpress-playground](https://github.com/WordPress/wordpress-playground)
- WP Plugin Directory: [wordpress.org/plugins](https://wordpress.org/plugins/)
