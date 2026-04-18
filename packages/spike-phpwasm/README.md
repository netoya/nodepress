# spike-phpwasm

**Sprint 1 Spike #25** — Evaluate `@php-wasm/node` for WordPress plugin compatibility (Tier 2)

## Goals

- [ ] Day 1: Ecosystem scan + basic setup + hello-world execution
- [ ] Day 2: Real WP shortcode plugin (POC)
- [ ] Day 3: Latency benchmark + memory footprint

## Quick Start

```bash
# From project root
cd packages/spike-phpwasm

# Install dependencies
npm install

# Run baseline test
npm run dev
```

Expected output:
- PHP 8.3 runtime loads in ~100–500ms (first time includes WASM decode)
- "Hello from PHP-WASM!" prints
- Hook simulation works
- Total setup < 1000ms

## Architecture

```
runner.ts
  └─ loadNodeRuntime('8.3')      [WASM PHP 8.3 + extensions]
     └─ PHP instance              [Sandbox for code execution]
        └─ php.runString()        [Execute arbitrary PHP]
```

## Known Limitations (Day 1 findings)

- **No I/O:** Filesystem and networking require explicit bridges
- **No database:** Standard extensions (PDO, mysqli) are NOT available in WASM
- **Available:** SQLite, OpenSSL, MySQL (limited), Libzip, Libpng
- **Synchronous:** `runString()` blocks—suitable for filters, unsuitable for async actions
- **Memory:** WASM module baseline ~70MB (unpacked), per-instance overhead TBD

## References

- ADR-003: PHP Compatibility Strategy
- [@php-wasm/node docs](https://developer.wordpress.org/playground)
