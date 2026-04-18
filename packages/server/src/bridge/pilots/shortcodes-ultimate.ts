/**
 * Tier 2 Shortcodes Ultimate Pilot — PHP-WASM shortcode processor.
 *
 * Implements the Shortcodes Ultimate plugin shortcode logic:
 * - [su_button url="..." color="..."]Text[/su_button]
 * - [su_box title="..." style="..."]Content[/su_box]
 * - [su_note]Note text[/su_note]
 *
 * Per ADR-017 §PHP Stubs Required: shortcodes are natively supported.
 * This pilot demonstrates rich HTML generation with attributes and nesting.
 *
 * Architecture:
 * - buildShortcodesUltimatePhpCode() generates the PHP logic (pure string + do_shortcode).
 * - registerShortcodesUltimatePlugin(registry) registers an anchor filter in Node.
 * - Tests demonstrate shortcode processing via PHP-WASM.
 *
 * Integration pattern (for REST handler):
 * 1. REST handler calls await renderShortcodes(content, context) with custom PHP injection.
 * 2. PHP processes shortcodes → HTML output.
 * 3. Node HookRegistry filters run on the result (sync passthrough).
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";

const SHORTCODES_ULTIMATE_PLUGIN_ID = "tier2-shortcodes-ultimate-pilot";

/**
 * PHP code that implements the Shortcodes Ultimate logic.
 *
 * Registers three shortcodes:
 * 1. su_button - link button with color attribute
 * 2. su_box - content box with optional title and style
 * 3. su_note - simple note div
 *
 * Pure string operations using htmlspecialchars (always bundled in php-wasm).
 * No network, no DB, no filesystem access.
 */
export function buildShortcodesUltimatePhpCode(): string {
  return `
// --- Tier 2 Shortcodes Ultimate Pilot ---

// Button shortcode: [su_button url="..." color="blue"]Text[/su_button]
add_shortcode('su_button', function(\$atts, \$content) {
    \$atts = shortcode_atts(['url' => '#', 'color' => 'default', 'target' => '_self'], \$atts);
    \$color = htmlspecialchars(\$atts['color'], ENT_QUOTES, 'UTF-8');
    \$url = htmlspecialchars(\$atts['url'], ENT_QUOTES, 'UTF-8');
    \$target = \$atts['target'] === '_blank' ? ' target="_blank"' : '';
    return '<a href="' . \$url . '" class="su-button su-button-' . \$color . '"' . \$target . '>' . do_shortcode(\$content) . '</a>';
});

// Box shortcode: [su_box title="..." style="default"]Content[/su_box]
add_shortcode('su_box', function(\$atts, \$content) {
    \$atts = shortcode_atts(['title' => '', 'style' => 'default'], \$atts);
    \$title = htmlspecialchars(\$atts['title'], ENT_QUOTES, 'UTF-8');
    \$style = htmlspecialchars(\$atts['style'], ENT_QUOTES, 'UTF-8');
    \$title_html = \$title ? '<div class="su-box-title">' . \$title . '</div>' : '';
    return '<div class="su-box su-box-' . \$style . '">' . \$title_html . '<div class="su-box-content">' . do_shortcode(\$content) . '</div></div>';
});

// Note shortcode: [su_note]Note text[/su_note]
add_shortcode('su_note', function(\$atts, \$content) {
    return '<div class="su-note">' . do_shortcode(\$content) . '</div>';
});

// Process the post content through shortcodes
\$postContent = do_shortcode(\$postContent);
`;
}

/**
 * Register the Shortcodes Ultimate pilot as a filter anchor in the HookRegistry.
 *
 * Per ADR-017 §Runtime Model:
 * - Heavy async PHP work (renderShortcodes) runs BEFORE applyFilters.
 * - This filter is a sync no-op that acts as an anchor at priority 9.6.
 * - The actual Shortcodes processing happens inside the bridge (PHP-side).
 *
 * In v1, PHP plugins do not call back into the Node HookRegistry (ADR-017 Out of Scope #1).
 * The Shortcodes logic is purely PHP-side.
 *
 * @param registry - The HookRegistry to register with
 */
export function registerShortcodesUltimatePlugin(registry: HookRegistry): void {
  // Idempotent: remove any stale entries.
  registry.removeAllByPlugin(SHORTCODES_ULTIMATE_PLUGIN_ID);

  // Sync no-op filter: content passes through. PHP already processed it.
  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: SHORTCODES_ULTIMATE_PLUGIN_ID,
    priority: 9.6, // Just after Footnotes (9.5), before default (10)
    fn: (content: string) => content,
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
