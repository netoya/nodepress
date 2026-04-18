/**
 * Tier 2 Display Posts Pilot — PHP-WASM shortcode processor.
 *
 * Implements the Display Posts shortcode logic:
 * Parses [display-posts] shortcode and generates an HTML list of posts
 * from the candidatePosts array injected from Node context. No DB access
 * in Tier 2 — posts are pre-loaded by the Node side.
 *
 * Per ADR-017 §PHP Stubs Required: shortcodes are natively supported.
 * This pilot demonstrates a plugin using candidatePosts context injection.
 *
 * Architecture:
 * - buildDisplayPostsPhpCode() generates the PHP logic that registers
 *   the [display-posts] shortcode and processes it.
 * - registerDisplayPostsPlugin(registry) registers an anchor filter in Node.
 * - Tests demonstrate shortcode processing via bridge simulation.
 *
 * Integration pattern (for REST handler):
 * 1. REST handler loads candidate posts from DB.
 * 2. REST handler calls await renderShortcodes(content, context) with
 *    candidatePosts array in context.
 * 3. PHP processes [display-posts] → list HTML from injected posts array.
 * 4. Node HookRegistry filters run on the result (sync passthrough).
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";

const DISPLAY_POSTS_PLUGIN_ID = "tier2-display-posts-pilot";

/**
 * PHP code that implements the Display Posts logic.
 *
 * Receives $np_candidate_posts array (injected by bridge bootstrap) and
 * registers the [display-posts] shortcode. The shortcode generates an HTML
 * unordered list of posts with links to /p/:slug.
 *
 * Attributes:
 * - include_excerpt (true|false, default false): whether to include excerpt in listing
 *
 * Pure PHP logic: no DB access, no network, no filesystem.
 */
export function buildDisplayPostsPhpCode(): string {
  return `
// --- Tier 2 Display Posts Pilot ---
add_shortcode('display-posts', function(\$atts = []) {
    global \$np_candidate_posts;
    
    \$atts = shortcode_atts(['include_excerpt' => 'false'], \$atts);
    
    if (empty(\$np_candidate_posts)) {
        return '';
    }
    
    \$html = '<ul class="display-posts-listing">';
    
    foreach (\$np_candidate_posts as \$post) {
        \$title = htmlspecialchars(\$post['title'] ?? '', ENT_QUOTES, 'UTF-8');
        \$slug = htmlspecialchars(\$post['slug'] ?? '', ENT_QUOTES, 'UTF-8');
        \$url = '/p/' . \$slug;
        
        \$html .= '<li><a href="' . \$url . '">' . \$title . '</a>';
        
        if (\$atts['include_excerpt'] === 'true' && !empty(\$post['excerpt'])) {
            \$excerpt = htmlspecialchars(\$post['excerpt'], ENT_QUOTES, 'UTF-8');
            \$html .= '<p>' . \$excerpt . '</p>';
        }
        
        \$html .= '</li>';
    }
    
    \$html .= '</ul>';
    
    return \$html;
});

// Process the post content
\$postContent = do_shortcode(\$postContent);
`;
}

/**
 * Register the Display Posts pilot as a filter anchor in the HookRegistry.
 *
 * Per ADR-017 §Runtime Model:
 * - Heavy async PHP work (renderShortcodes) runs BEFORE applyFilters.
 * - This filter is a sync no-op that acts as an anchor at priority 9.8.
 * - The actual Display Posts processing happens inside the bridge (PHP-side).
 *
 * In v1, PHP plugins do not call back into the Node HookRegistry (ADR-017 Out of Scope #1).
 * The Display Posts logic is purely PHP-side.
 *
 * @param registry - The HookRegistry to register with
 */
export function registerDisplayPostsPlugin(registry: HookRegistry): void {
  // Idempotent: remove any stale entries (mirrors DEMO_PLUGIN_ID pattern).
  registry.removeAllByPlugin(DISPLAY_POSTS_PLUGIN_ID);

  // Sync no-op filter: content passes through. PHP already processed it.
  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: DISPLAY_POSTS_PLUGIN_ID,
    priority: 9.8, // After footnotes (9.5), before default (10)
    fn: (content: string) => content,
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
