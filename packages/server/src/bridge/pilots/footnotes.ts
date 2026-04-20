/**
 * Tier 2 Footnotes Pilot — PHP-WASM shortcode processor.
 *
 * Implements the Footnotes plugin shortcode logic. Two syntaxes supported:
 *  1. WordPress classic shortcode: [footnote]text[/footnote] — primary WP-compat
 *     surface, processed via add_shortcode() so it participates in do_shortcode().
 *  2. MCI legacy syntax: ((text)) — preserved for backwards-compat with the
 *     original pilot. Applied as a pre-pass over $postContent.
 *
 * Both paths share a single footnotes list and produce a single footnotes
 * section appended at the end of the content.
 *
 * Per ADR-017 §PHP Stubs Required: shortcodes are natively supported.
 * This pilot demonstrates one plugin using that capability end-to-end.
 *
 * Architecture:
 * - buildFootnotesPhpCode() generates the PHP logic (pure string + pcre + add_shortcode).
 * - registerFootnotesPlugin(registry) registers an anchor filter in Node.
 * - Tests demonstrate footnote processing via PHP-WASM.
 *
 * Integration pattern (for REST handler):
 * 1. REST handler calls await renderShortcodes(content, context).
 * 2. PHP runs pilot code: register [footnote] shortcode + pre-process ((text)).
 * 3. do_shortcode($postContent) expands [footnote] tags → anchors.
 * 4. Footnotes section is appended after do_shortcode.
 * 5. Node HookRegistry filters run on the result (sync passthrough).
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";

const FOOTNOTES_PLUGIN_ID = "tier2-footnotes-pilot";

/**
 * PHP code that implements the Footnotes logic.
 *
 * Supports two syntaxes, sharing a single footnote counter and list:
 *  1. [footnote]text[/footnote] — classic WP shortcode, registered via
 *     add_shortcode() so it integrates with do_shortcode() naturally.
 *  2. ((text)) — MCI legacy syntax, processed as a pre-pass.
 *
 * Flow (runs inside the bridge runner, BEFORE the final np_bridge_return
 * wrapper calls do_shortcode one more time; second pass is idempotent because
 * all [footnote] tags have already been expanded and no other shortcodes are
 * introduced by this pilot):
 *   1. Reset shared state (\$__np_footnotes, \$__np_footnote_n).
 *   2. Register [footnote] shortcode that accumulates and returns an anchor.
 *   3. Pre-process \$postContent to expand ((text)) legacy syntax.
 *   4. Call do_shortcode() on \$postContent to expand [footnote] tags.
 *   5. Append <div class="footnotes">…</div> section when the list is non-empty.
 *
 * Pure regex + string operations using pcre (always bundled in php-wasm).
 * No network, no DB, no filesystem access.
 */
export function buildFootnotesPhpCode(): string {
  return `
// --- Tier 2 Footnotes Pilot ---

// Shared state for this invocation; reset on every render (ADR-017 scope reset).
\$GLOBALS['__np_footnotes'] = [];
\$GLOBALS['__np_footnote_n'] = 0;

/**
 * Register the [footnote] shortcode.
 * Accepts inner content (e.g., [footnote]text[/footnote]) and returns a
 * numbered superscript anchor. The inner text is pushed onto the shared list
 * so it can be rendered in the footnotes section after do_shortcode runs.
 */
add_shortcode('footnote', function(\$atts, \$content = '', \$tag = '') {
    \$GLOBALS['__np_footnote_n']++;
    \$n = \$GLOBALS['__np_footnote_n'];
    \$GLOBALS['__np_footnotes'][] = (string)\$content;
    return '<sup id="fnref-' . \$n . '"><a href="#fn-' . \$n . '" class="footnote-ref">' . \$n . '</a></sup>';
});

/**
 * Legacy MCI ((text)) pre-pass. Shares the same counter/list as the shortcode.
 */
\$postContent = preg_replace_callback(
    '/\\(\\((.+?)\\)\\)/',
    function(\$matches) {
        \$GLOBALS['__np_footnote_n']++;
        \$n = \$GLOBALS['__np_footnote_n'];
        \$GLOBALS['__np_footnotes'][] = (string)\$matches[1];
        return '<sup id="fnref-' . \$n . '"><a href="#fn-' . \$n . '" class="footnote-ref">' . \$n . '</a></sup>';
    },
    \$postContent
);

// Expand [footnote]…[/footnote] shortcodes now so we can append the footnotes
// section right after. The runner will call do_shortcode() again on the final
// value; that second call is a no-op because all tags have been consumed.
\$postContent = do_shortcode(\$postContent);

// Append footnotes section if any entries were collected.
if (!empty(\$GLOBALS['__np_footnotes'])) {
    \$__np_section = '<div class="footnotes"><ol>';
    foreach (\$GLOBALS['__np_footnotes'] as \$__np_i => \$__np_fn) {
        \$__np_num = \$__np_i + 1;
        \$__np_section .= '<li id="fn-' . \$__np_num . '">' . htmlspecialchars(\$__np_fn, ENT_QUOTES, 'UTF-8');
        \$__np_section .= ' <a href="#fnref-' . \$__np_num . '" class="footnote-backref">&#8617;</a></li>';
    }
    \$__np_section .= '</ol></div>';
    \$postContent .= \$__np_section;
}
`;
}

/**
 * Register the Footnotes pilot as a filter anchor in the HookRegistry.
 *
 * Per ADR-017 §Runtime Model:
 * - Heavy async PHP work (renderShortcodes) runs BEFORE applyFilters.
 * - This filter is a sync no-op that acts as an anchor at priority 9.5.
 * - The actual Footnotes processing happens inside the bridge (PHP-side).
 *
 * In v1, PHP plugins do not call back into the Node HookRegistry (ADR-017 Out of Scope #1).
 * The Footnotes logic is purely PHP-side.
 *
 * @param registry - The HookRegistry to register with
 */
export function registerFootnotesPlugin(registry: HookRegistry): void {
  // Idempotent: remove any stale entries (mirrors DEMO_PLUGIN_ID pattern).
  registry.removeAllByPlugin(FOOTNOTES_PLUGIN_ID);

  // Sync no-op filter: content passes through. PHP already processed it.
  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: FOOTNOTES_PLUGIN_ID,
    priority: 9.5, // Just after bridge filter (9), before default (10)
    fn: (content: string) => content,
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
