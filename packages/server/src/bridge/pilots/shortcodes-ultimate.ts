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
 * Read and validate NODEPRESS_SHORTCODE_MAX_DEPTH env var.
 *
 * - Default: 10
 * - Valid range: 1-50
 * - Out of range or invalid → uses default 10 with warning logged
 * - Read once at module init time (not on each invocation)
 */
function getShortcodeMaxDepth(): number {
  const envValue = process.env.NODEPRESS_SHORTCODE_MAX_DEPTH;

  // Undefined or empty → use default
  if (!envValue) {
    return 10;
  }

  const parsed = parseInt(envValue, 10);

  // Check if parsing succeeded and within valid range [1, 50]
  if (isNaN(parsed) || parsed < 1 || parsed > 50) {
    console.warn(
      `[NodePress Bridge] NODEPRESS_SHORTCODE_MAX_DEPTH="${envValue}" is invalid or out of range [1-50]. Using default 10.`,
    );
    return 10;
  }

  return parsed;
}

// Cache the depth limit at module init time
const SHORTCODE_MAX_DEPTH = getShortcodeMaxDepth();

/**
 * SU Framework stubs — exported separately for potential reuse.
 *
 * The Shortcodes Ultimate plugin uses internal functions like su_add_shortcode(),
 * su_get_css_class(), su_query_asset(), etc. These are minimal no-op stubs that
 * allow the plugin's real code (su_button, su_spacer, su_box, su_note, etc.) to
 * register themselves via su_add_shortcode() instead of direct add_shortcode().
 *
 * Injected at the top of buildShortcodesUltimatePhpCode() so plugin code runs
 * with access to these functions.
 *
 * Per memo 2026-04-19: stubs are prepended within the pilot, NOT scattered
 * across other pilots. All SU-specific stubs live here.
 */
function buildSuFrameworkStubs(): string {
  return `
// --- Shortcodes Ultimate Framework Stubs ---
function su_add_shortcode(\$args) {
    if (isset(\$args['id']) && isset(\$args['callback'])) {
        add_shortcode('su_' . \$args['id'], \$args['callback']);
    }
}
function su_get_plugin_url() { return 'http://localhost:3000/wp-content/plugins/shortcodes-ultimate/'; }
function su_get_css_class(\$atts) { return isset(\$atts['class']) && \$atts['class'] ? ' ' . esc_attr(\$atts['class']) : ''; }
function su_query_asset(\$type, \$handle) { return false; }
function su_adjust_brightness(\$hex, \$steps) { return \$hex; }
function su_adjust_lightness(\$hex, \$steps) { return \$hex; }
function su_do_nested_shortcodes(\$content, \$shortcode) {
    static \$depth = 0;
    if (\$depth >= ${SHORTCODE_MAX_DEPTH}) return \$content;
    \$depth++;
    \$result = do_shortcode(\$content);
    \$depth--;
    return \$result;
}
function su_do_attribute(\$value) { return esc_html(\$value); }
function su_parse_shortcode_atts(\$tag, \$atts) {
    return is_array(\$atts) ? \$atts : [];
}
function su_html_style(\$styles) {
    if (empty(\$styles)) return '';
    return ' style="' . implode(';', \$styles) . '"';
}
function su_sanitize_css_color(\$hex) { return preg_match('/^#[0-9a-f]{3,6}\$/i', \$hex) ? \$hex : '#000000'; }
function su_get_option(\$key, \$default = false) { return \$default; }
function su_get_settings_data() { return []; }
function su_get_asset_path(\$file) { return '/assets/' . basename(\$file); }
function su_add_css_target(\$target, \$inline, \$priority = 10) { return true; }
function su_add_js_target(\$target, \$inline, \$priority = 10) { return true; }
function su_get_button_size_hint(\$size) { return ''; }
function su_icons(\$return_format = 'array') { return []; }
`;
}

/**
 * PHP code that implements the Shortcodes Ultimate logic.
 *
 * Includes:
 * 1. SU framework stubs (su_add_shortcode, su_get_css_class, etc.)
 *    so the real plugin code (su_button, su_spacer, su_box, su_note) can register.
 * 2. Implementation of the three shortcodes (button, box, note) as fallback.
 *
 * Pure string operations using htmlspecialchars (always bundled in php-wasm).
 * No network, no DB, no filesystem access.
 *
 * The stubs allow the real plugin code to run correctly. The hardcoded shortcodes
 * are included as a minimal fallback if the plugin code is not injected separately.
 */
export function buildShortcodesUltimatePhpCode(): string {
  return (
    buildSuFrameworkStubs() +
    `
// --- Tier 2 Shortcodes Ultimate Pilot Shortcodes ---

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

// Spacer shortcode: [su_spacer size="30"]
add_shortcode('su_spacer', function(\$atts, \$content) {
    \$atts = shortcode_atts(['size' => '20'], \$atts);
    \$size = (int)\$atts['size'];
    return '<div class="su-spacer" style="height:' . \$size . 'px;"></div>';
});

// Process the post content through shortcodes
\$postContent = do_shortcode(\$postContent);
`
  );
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
