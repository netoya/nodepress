/**
 * Tier 2 Contact Form 7 Pilot — PHP-WASM shortcode processor.
 *
 * Implements the Contact Form 7 shortcode logic:
 * - [contact-form-7 id="1" title="Contact form 1"]
 * - [contact-form id="1" title="Contact form 1"]  (alias)
 *
 * Renders an HTML <form> with standard CF7 fields (name, email, subject,
 * message, submit). No server-side submission logic — Tier 2 renders the
 * form HTML only. Submission is handled by the Node REST layer (Sprint 6+).
 *
 * Per ADR-017 §PHP Stubs Required: shortcodes are natively supported.
 * This pilot demonstrates form HTML generation with attribute parsing.
 *
 * Architecture:
 * - buildContactForm7PhpCode() generates the PHP shortcode logic.
 * - registerContactForm7Plugin(registry) anchors the filter in Node.
 * - Tests verify form HTML output and attribute parsing.
 *
 * Limitations vs real CF7:
 * - Form fields are static (name, email, subject, message). Dynamic field
 *   configuration from DB is out of scope for Tier 2.
 * - No nonce/CSRF token (Node layer responsibility).
 * - No AJAX submission endpoint in this sprint.
 */

import type { FilterEntry, HookRegistry } from "@nodepress/core";

const CONTACT_FORM_7_PLUGIN_ID = "tier2-contact-form-7-pilot";

/**
 * PHP code that implements the Contact Form 7 shortcode.
 *
 * Registers [contact-form-7] and its alias [contact-form].
 * Renders a standard HTML form matching CF7's default output structure
 * (class names, data attributes) so existing CF7 CSS themes apply.
 *
 * Pure PHP: htmlspecialchars, string concatenation, shortcode_atts.
 * No DB, no network, no filesystem.
 */
export function buildContactForm7PhpCode(): string {
  return `
// --- Tier 2 Contact Form 7 Pilot ---

function np_render_contact_form(\$atts) {
    \$atts = shortcode_atts([
        'id'    => '1',
        'title' => 'Contact form',
        'html_class' => '',
        'html_name'  => '',
    ], \$atts);

    \$form_id   = (int) \$atts['id'];
    \$title     = htmlspecialchars(\$atts['title'], ENT_QUOTES, 'UTF-8');
    \$cls_extra = \$atts['html_class'] ? ' ' . htmlspecialchars(\$atts['html_class'], ENT_QUOTES, 'UTF-8') : '';

    \$html  = '<div class="wpcf7 no-js" id="wpcf7-f' . \$form_id . '" lang="en" dir="ltr">';
    \$html .= '<div class="screen-reader-response"><p role="status" aria-live="polite" aria-atomic="true"></p><ul></ul></div>';
    \$html .= '<form action="" method="post" class="wpcf7-form init' . \$cls_extra . '" aria-label="' . \$title . '" novalidate="novalidate" data-status="init">';
    \$html .= '<div style="display:none"><input type="hidden" name="_wpcf7" value="' . \$form_id . '" />';
    \$html .= '<input type="hidden" name="_wpcf7_version" value="5.9" /></div>';

    // Name field
    \$html .= '<p><label>Your Name (required)<br />';
    \$html .= '<span class="wpcf7-form-control-wrap" data-name="your-name">';
    \$html .= '<input size="40" class="wpcf7-form-control wpcf7-text wpcf7-validates-as-required" aria-required="true" aria-invalid="false" placeholder="Full Name" type="text" name="your-name" /></span></label></p>';

    // Email field
    \$html .= '<p><label>Your Email (required)<br />';
    \$html .= '<span class="wpcf7-form-control-wrap" data-name="your-email">';
    \$html .= '<input size="40" class="wpcf7-form-control wpcf7-email wpcf7-validates-as-required wpcf7-validates-as-email" aria-required="true" aria-invalid="false" placeholder="email@example.com" type="email" name="your-email" /></span></label></p>';

    // Subject field
    \$html .= '<p><label>Subject<br />';
    \$html .= '<span class="wpcf7-form-control-wrap" data-name="your-subject">';
    \$html .= '<input size="40" class="wpcf7-form-control wpcf7-text" aria-invalid="false" placeholder="Subject" type="text" name="your-subject" /></span></label></p>';

    // Message field
    \$html .= '<p><label>Your Message<br />';
    \$html .= '<span class="wpcf7-form-control-wrap" data-name="your-message">';
    \$html .= '<textarea cols="40" rows="10" class="wpcf7-form-control wpcf7-textarea" aria-invalid="false" placeholder="Your message here..." name="your-message"></textarea></span></label></p>';

    // Submit
    \$html .= '<p><input class="wpcf7-form-control wpcf7-submit has-spinner" type="submit" value="Send" />';
    \$html .= '<span class="wpcf7-spinner"></span></p>';

    \$html .= '</form></div>';

    return \$html;
}

add_shortcode('contact-form-7', 'np_render_contact_form');
add_shortcode('contact-form', 'np_render_contact_form');

// Process the post content
\$postContent = do_shortcode(\$postContent);
`;
}

/**
 * Register the Contact Form 7 pilot as a filter anchor in the HookRegistry.
 *
 * Per ADR-017 §Runtime Model: PHP processing runs inside renderShortcodes()
 * before applyFilters. This Node-side entry is a sync no-op anchor.
 */
export function registerContactForm7Plugin(registry: HookRegistry): void {
  registry.removeAllByPlugin(CONTACT_FORM_7_PLUGIN_ID);

  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: CONTACT_FORM_7_PLUGIN_ID,
    priority: 9.7,
    fn: (content: string) => content,
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
