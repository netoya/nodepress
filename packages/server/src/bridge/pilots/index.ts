/**
 * Bridge Pilot Registry
 *
 * Central registry of all active pilots that provide PHP code injection
 * into the bridge runtime. Each pilot defines a suite of compatible
 * WordPress plugin stubs, shortcodes, or filters that execute within
 * the PHP-WASM sandbox.
 *
 * Registration contract:
 * - Pilots are registered statically at module load (ADR-017 §Security).
 * - Each pilot's PHP code is injected before np_bridge_return() runs.
 * - Injection order follows ACTIVE_PILOTS array order (not WP priority).
 *   WP priority (via add_action/add_shortcode) governs execution order.
 * - New pilots must not modify user input or break security boundary
 *   (ADR-018 §Constraints).
 */

import { buildFootnotesPhpCode } from "./footnotes.js";
import { buildShortcodesUltimatePhpCode } from "./shortcodes-ultimate.js";
import { buildDisplayPostsPhpCode } from "./display-posts.js";
import { buildContactForm7PhpCode } from "./contact-form-7.js";

/**
 * Minimal contract for a bridge pilot.
 * @readonly id — Unique identifier (e.g., "tier2-footnotes-pilot")
 * @readonly buildPhpCode — Function that returns PHP code string (never null)
 */
export interface BridgePilot {
  readonly id: string;
  readonly buildPhpCode: () => string;
}

/**
 * Static registry of all active pilots.
 * These are injected into every renderShortcodes() call in stable array order.
 *
 * Order in this array is the order pilots' PHP code is prepended.
 * Execution order within PHP is determined by add_action/add_shortcode priorities,
 * not this array order — avoid coupling the two.
 *
 * Adding/removing pilots here requires:
 * 1. Pilot module exported from this package (pilots/*.ts).
 * 2. ADR-017 amendment if pilot touches security boundary.
 * 3. Test in bridge.integration.test.ts.
 * 4. Update this comment if rationale changes.
 */
export const ACTIVE_PILOTS: readonly BridgePilot[] = [
  {
    id: "tier2-footnotes-pilot",
    buildPhpCode: buildFootnotesPhpCode,
  },
  {
    id: "tier2-shortcodes-ultimate-pilot",
    buildPhpCode: buildShortcodesUltimatePhpCode,
  },
  {
    id: "tier2-display-posts-pilot",
    buildPhpCode: buildDisplayPostsPhpCode,
  },
  {
    id: "tier2-contact-form-7-pilot",
    buildPhpCode: buildContactForm7PhpCode,
  },
];
