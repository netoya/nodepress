<?php
/**
 * NodePress Hello World Shortcode Plugin
 * Minimal example: registers and executes a shortcode
 */

// Global shortcode registry (simulating WordPress)
global $shortcode_tags;
if (!isset($shortcode_tags)) {
    $shortcode_tags = [];
}

/**
 * Register a shortcode handler
 */
function add_shortcode($tag, $callback) {
    global $shortcode_tags;
    $shortcode_tags[$tag] = $callback;
}

/**
 * Execute shortcodes in content
 */
function do_shortcode($content) {
    global $shortcode_tags;
    
    foreach ($shortcode_tags as $tag => $callback) {
        $pattern = '/\[' . preg_quote($tag) . '(.*?)\]/is';
        $content = preg_replace_callback($pattern, function($matches) use ($callback) {
            // Parse attributes (simple version)
            $attrs = [];
            $atts_str = trim($matches[1]);
            if (!empty($atts_str)) {
                // Very basic attribute parsing
                preg_match_all('/(\w+)=["\']?([^"\'\]]*)["\']?/', $atts_str, $pairs);
                for ($i = 0; $i < count($pairs[1]); $i++) {
                    $attrs[$pairs[1][$i]] = $pairs[2][$i];
                }
            }
            
            return call_user_func($callback, $attrs);
        }, $content);
    }
    
    return $content;
}

/**
 * Register the hello-nodepress shortcode
 */
add_shortcode('hello-nodepress', function($attrs) {
    $name = isset($attrs['name']) ? $attrs['name'] : 'NodePress';
    $date = date('Y-m-d H:i:s');
    $hash = substr(hash('sha256', $date . $name), 0, 8);
    
    return sprintf(
        '<div class="hello-nodepress"><strong>Hello %s!</strong> Generated at %s [hash: %s]</div>',
        htmlspecialchars($name),
        $date,
        $hash
    );
});

// Test execution: echo the rendered shortcode
echo do_shortcode('[hello-nodepress name="World"]');
