/**
 * Tier 2 Footnotes Pilot — PHP-WASM shortcode processor.
 *
 * Implements the Footnotes plugin shortcode logic (MCI Footnotes style):
 * Parses ((footnote text)) syntax, generates numbered links, and appends
 * a footnotes section. Uses pure PHP string + regex logic (pcre extension).
 *
 * Per ADR-017 §PHP Stubs Required: shortcodes are natively supported.
 * This pilot demonstrates one plugin using that capability.
 *
 * Architecture:
 * - buildFootnotesPhpCode() generates the PHP logic (pure string + pcre).
 * - registerFootnotesPlugin(registry) registers an anchor filter in Node.
 * - Tests demonstrate footnote processing via PHP-WASM.
 *
 * Integration pattern (for REST handler):
 * 1. REST handler calls await renderShortcodes(content, context) with custom PHP injection.
 * 2. PHP processes footnotes ((text)) → anchors + footnotes section.
 * 3. Node HookRegistry filters run on the result (sync passthrough).
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";

const FOOTNOTES_PLUGIN_ID = "tier2-footnotes-pilot";

/**
 * PHP code that implements the Footnotes logic.
 *
 * Processes content with ((footnote text)) syntax, replacing each with a
 * numbered superscript anchor and appending a footnotes section at the end.
 *
 * Pure regex + string operations using pcre (always bundled in php-wasm).
 * No network, no DB, no filesystem access.
 */
export function buildFootnotesPhpCode(): string {
  return `
// --- Tier 2 Footnotes Pilot ---
function process_footnotes(\$content) {
    \$footnotes = [];
    \$n = 0;

    // Parse ((text)) syntax and replace with numbered anchors
    \$content = preg_replace_callback(
        '/\\(\\((.+?)\\)\\)/',
        function(\$matches) use (&\$footnotes, &\$n) {
            \$n++;
            \$footnotes[] = \$matches[1];
            return '<sup id="fnref-' . \$n . '"><a href="#fn-' . \$n . '" class="footnote-ref">' . \$n . '</a></sup>';
        },
        \$content
    );

    // Append footnotes section if any were found
    if (!empty(\$footnotes)) {
        \$content .= '<div class="footnotes"><ol>';
        foreach (\$footnotes as \$i => \$fn) {
            \$num = \$i + 1;
            \$content .= '<li id="fn-' . \$num . '">' . htmlspecialchars(\$fn, ENT_QUOTES, 'UTF-8');
            \$content .= ' <a href="#fnref-' . \$num . '" class="footnote-backref">↩</a></li>';
        }
        \$content .= '</ol></div>';
    }

    return \$content;
}

// Process the post content
\$postContent = process_footnotes(\$postContent);
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
