/**
 * Tier 2 Bridge — NodePress PHP-WASM shortcode renderer.
 *
 * Implements the bridge surface defined in ADR-017, operating within the
 * security boundary of ADR-018 and emitting observability spans per ADR-019.
 *
 * Public API: renderShortcodes, destroyBridge, registerBridgeHooks.
 * Everything else is internal.
 */

import { performance } from "perf_hooks";
import { randomUUID } from "crypto";
import type { FilterEntry, HookRegistry } from "@nodepress/core";

// ---------------------------------------------------------------------------
// Types (ADR-017 §Bridge Contract)
// ---------------------------------------------------------------------------

export interface BridgeInput {
  readonly postContent: string;
  readonly context: {
    readonly postId: number;
    readonly postType: string;
    readonly postStatus: string;
    readonly candidatePosts?: ReadonlyArray<{
      id: number;
      title: string;
      slug: string;
    }>;
    readonly pluginConfig?: Readonly<Record<string, unknown>>;
  };
  readonly meta?: {
    readonly traceId?: string;
    readonly invocationId?: string;
  };
}

export type BridgeErrorCode =
  | "BRIDGE_TIMEOUT"
  | "BRIDGE_OOM"
  | "BRIDGE_FATAL"
  | "BRIDGE_INIT_FAILED"
  | "BRIDGE_INPUT_REJECTED";

export interface BridgeOutput {
  readonly html: string;
  readonly warnings: string[];
  readonly error: BridgeErrorCode | null;
}

// ---------------------------------------------------------------------------
// Observability (ADR-019)
// ---------------------------------------------------------------------------

interface BridgeSpan {
  readonly event: "bridge.render";
  readonly trace_id: string;
  readonly invocation_id: string;
  readonly plugin_id: string;
  readonly shortcode_tag: string;
  readonly duration_ms: number;
  readonly input_size_bytes: number;
  readonly output_size_bytes: number;
  readonly error_code: string | null;
  readonly warnings_count: number;
  readonly timestamp: string;
}

export const BRIDGE_PLUGIN_ID = "tier2-bridge";

/** Heuristic: first [tag] found in content, or "unknown". */
function detectPrimaryTag(content: string): string {
  const match = /\[([a-z][a-z0-9_-]*)/i.exec(content);
  return match?.[1] ?? "unknown";
}

function resolveLevel(span: BridgeSpan): "info" | "warn" | "error" {
  if (
    span.error_code === "BRIDGE_OOM" ||
    span.error_code === "BRIDGE_TIMEOUT" ||
    span.error_code === "BRIDGE_FATAL" ||
    span.error_code === "BRIDGE_INIT_FAILED"
  )
    return "error";
  if (
    span.error_code !== null ||
    span.warnings_count > 0 ||
    span.duration_ms >= 2000
  )
    return "warn";
  return "info";
}

function emitSpan(span: BridgeSpan): void {
  const level = resolveLevel(span);
  console.log(JSON.stringify({ level, ...span }));
}

// ---------------------------------------------------------------------------
// Input validation (ADR-017 §Data Flow IN, ADR-018 §Constraints §3)
// ---------------------------------------------------------------------------

const ONE_MB = 1024 * 1024;

function validateInput(
  input: BridgeInput,
): { ok: true } | { ok: false; reason: string } {
  if (typeof input.postContent !== "string") {
    return { ok: false, reason: "postContent must be a string" };
  }
  if (Buffer.byteLength(input.postContent, "utf8") > ONE_MB) {
    return {
      ok: false,
      reason: "postContent exceeds 1MB limit",
    };
  }
  if (!Number.isInteger(input.context.postId) || input.context.postId < 0) {
    return {
      ok: false,
      reason: "context.postId must be a non-negative integer",
    };
  }
  if (
    input.context.candidatePosts &&
    input.context.candidatePosts.length > 100
  ) {
    return {
      ok: false,
      reason: "context.candidatePosts exceeds 100 entries",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// PHP-WASM singleton runtime (ADR-017 §Runtime Model)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PhpInstance = any;

let _phpInstance: PhpInstance | null = null;
let _initInProgress = false;
let _initFailed = false;

/**
 * Lazy-initialize the PHP-WASM singleton. Returns null on failure so callers
 * can return BRIDGE_INIT_FAILED with passthrough.
 */
async function getPhpInstance(): Promise<PhpInstance | null> {
  if (_phpInstance !== null) return _phpInstance;
  if (_initFailed) return null;
  if (_initInProgress) {
    // Spin-wait until the concurrent init resolves. Simple for Sprint 2 load.
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (!_initInProgress) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
    return _phpInstance;
  }

  _initInProgress = true;
  try {
    // Dynamic imports keep the module loadable even when @php-wasm/node is
    // absent (e.g., in test environments that mock the module).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phpWasm = (await import("@php-wasm/node")) as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { PHP } = (await import("@php-wasm/universal")) as any;
    const { loadNodeRuntime } = phpWasm;

    const runtime = await loadNodeRuntime("8.0", {
      emscriptenOptions: {
        processId: process.pid,
      },
    });
    _phpInstance = new PHP(runtime);
    return _phpInstance;
  } catch {
    _initFailed = true;
    return null;
  } finally {
    _initInProgress = false;
  }
}

/**
 * Destroy the PHP-WASM singleton. Useful for test teardown or graceful shutdown.
 */
export function destroyBridge(): void {
  if (_phpInstance !== null) {
    try {
      // PHP-WASM does not expose a formal destroy; best effort is to null the ref.

      if (typeof _phpInstance.exit === "function") _phpInstance.exit();
    } catch {
      // Ignore — we are tearing down.
    }
    _phpInstance = null;
  }
  _initFailed = false;
}

// ---------------------------------------------------------------------------
// PHP bootstrap code (ADR-017 §PHP Stubs Required, ADR-018 §Constraints)
// ---------------------------------------------------------------------------

/**
 * Minimal WP-compatible shim + security constraints applied before every run.
 * Returns a PHP code string that:
 * 1. Applies php.ini overrides (ADR-018 §2).
 * 2. Resets all mutable PHP state (scope reset between invocations).
 * 3. Stubs dangerous functions.
 * 4. Implements add_shortcode / do_shortcode / shortcode_atts.
 * 5. Defines np_bridge_return() for pilot output convention.
 */
function buildBootstrapCode(
  postContent: string,
  context: BridgeInput["context"],
): string {
  // Safely escape postContent for PHP double-quoted string embedding.
  const escapedContent = postContent
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

  const candidatePostsJson = JSON.stringify(context.candidatePosts ?? []);
  const pluginConfigJson = JSON.stringify(context.pluginConfig ?? {});

  return `<?php
// --- ADR-018 php.ini overrides ---
ini_set('display_errors', '0');
ini_set('log_errors', '0');
ini_set('allow_url_fopen', '0');
ini_set('allow_url_include', '0');
ini_set('memory_limit', '32M');
ini_set('max_execution_time', '2');

// --- Global state reset (scope reset between invocations) ---
global $np_shortcodes, $np_warnings, $np_filters;
$np_shortcodes = [];
$np_warnings   = [];
$np_filters    = [];

// --- Context injection ---
$np_candidate_posts = json_decode('${candidatePostsJson.replace(/'/g, "\\'")}', true) ?: [];
$np_plugin_config   = json_decode('${pluginConfigJson.replace(/'/g, "\\'")}', true) ?: [];

// --- Security stubs (ADR-018 §Constraints §1) ---
function exec($cmd = '', &$output = null, &$return_var = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: exec';
  return '';
}
function system($cmd = '', &$return_var = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: system';
  return '';
}
function shell_exec($cmd = '') {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: shell_exec';
  return '';
}
function passthru($cmd = '', &$return_var = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: passthru';
}
function popen($command = '', $mode = '') {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: popen';
  return false;
}
function proc_open($command, $descriptorspec, &$pipes, $cwd = null, $env = null, $other_options = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: proc_open';
  return false;
}
function mail($to = '', $subject = '', $message = '', $headers = '', $params = '') {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: mail to=' . substr($to, 0, 20);
  return false;
}
function curl_exec($handle = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: curl_exec';
  return false;
}
function curl_multi_exec($multi_handle = null, &$still_running = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: curl_multi_exec';
  return 0;
}
function file_put_contents($filename = '', $data = '', $flags = 0, $context = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: file_put_contents';
  return false;
}
function fwrite($handle = null, $string = '', $length = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: fwrite';
  return 0;
}
// --- WP HTTP API stubs ---
function wp_remote_get($url = '', $args = []) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_get';
  return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
}
function wp_remote_post($url = '', $args = []) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_post';
  return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
}
function wp_remote_request($url = '', $args = []) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_request';
  return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
}
function wp_mail($to, $subject, $message, $headers = '', $attachments = []) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] blocked: wp_mail';
  return false;
}

// --- WP_Error stub ---
class WP_Error {
  public $errors = [];
  public $error_data = [];
  public function __construct($code = '', $message = '', $data = '') {
    if (!empty($code)) {
      $this->errors[$code][] = $message;
      if (!empty($data)) $this->error_data[$code] = $data;
    }
  }
  public function get_error_message($code = '') { return $message ?? ''; }
}
function is_wp_error($thing) { return ($thing instanceof WP_Error); }

// --- WP Options API (backed by pluginConfig) ---
function get_option($option, $default = false) {
  global $np_plugin_config;
  return isset($np_plugin_config[$option]) ? $np_plugin_config[$option] : $default;
}
function update_option($option, $value, $autoload = null) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] update_option ignored: ' . $option;
  return true;
}

// --- WP Posts API (backed by candidatePosts) ---
function get_post($id = null) {
  global $np_candidate_posts;
  foreach ($np_candidate_posts as $p) {
    if ($p['id'] == $id) {
      $obj = new stdClass();
      $obj->ID = $p['id'];
      $obj->post_title = $p['title'] ?? '';
      $obj->post_name = $p['slug'] ?? '';
      return $obj;
    }
  }
  return null;
}
function get_posts($args = []) {
  global $np_candidate_posts, $np_warnings;
  $ignored = array_diff(array_keys($args), ['numberposts', 'posts_per_page', 'post_type']);
  if (!empty($ignored)) {
    $np_warnings[] = '[BRIDGE WARN] get_posts: ignored args: ' . implode(', ', $ignored);
  }
  $limit = isset($args['numberposts']) ? (int)$args['numberposts'] : (isset($args['posts_per_page']) ? (int)$args['posts_per_page'] : count($np_candidate_posts));
  $result = [];
  foreach (array_slice($np_candidate_posts, 0, $limit) as $p) {
    $obj = new stdClass();
    $obj->ID = $p['id'];
    $obj->post_title = $p['title'] ?? '';
    $obj->post_name = $p['slug'] ?? '';
    $result[] = $obj;
  }
  return $result;
}
function get_post_meta($post_id, $key = '', $single = false) { return ''; }

// --- WP i18n stubs (intl absent per ADR-008) ---
function __($text, $domain = 'default') { return $text; }
function _e($text, $domain = 'default') { echo $text; }
function _x($text, $context, $domain = 'default') { return $text; }
function esc_html($text) { return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_attr($text) { return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8'); }
function esc_url($url) { return filter_var($url, FILTER_SANITIZE_URL) ?: ''; }
function sanitize_text_field($str) { return trim(strip_tags($str)); }
function wp_kses_post($content) {
  global $np_warnings;
  $np_warnings[] = '[BRIDGE WARN] wp_kses_post: stub, returning input unchanged';
  return $content;
}

// --- PHP-local filter/action maps (do NOT cross to Node HookRegistry in v1) ---
function add_filter($tag, $callback, $priority = 10, $accepted_args = 1) {
  global $np_filters;
  $np_filters[$tag][] = ['cb' => $callback, 'pri' => $priority];
}
function apply_filters($tag, $value, ...$args) {
  global $np_filters;
  if (!isset($np_filters[$tag])) return $value;
  usort($np_filters[$tag], fn($a, $b) => $a['pri'] - $b['pri']);
  foreach ($np_filters[$tag] as $entry) {
    $value = call_user_func($entry['cb'], $value, ...$args);
  }
  return $value;
}
function do_action($tag, ...$args) {
  // PHP-local only, no cross-runtime dispatch in v1.
}

// --- Shortcode engine ---
function add_shortcode($tag, $callback) {
  global $np_shortcodes;
  $np_shortcodes[$tag] = $callback;
}

function shortcode_atts($pairs, $atts, $shortcode = '') {
  $atts = (array)$atts;
  $out = [];
  foreach ($pairs as $name => $default) {
    $out[$name] = isset($atts[$name]) ? $atts[$name] : $default;
  }
  return $out;
}

function shortcode_parse_atts($text) {
  $atts = [];
  $pattern = '/([\\w-]+)\\s*=\\s*"([^"]*)"(*SKIP)(*F)|([\\w-]+)\\s*=\\s*\'([^\']*)\'(*SKIP)(*F)|([\\w-]+)\\s*=\\s*(\\S+)|"([^"]*)"(*SKIP)(*F)|\'([^\']*)\'(*SKIP)(*F)|([^\\s]+)/';
  preg_match_all($pattern, $text, $match);
  // Simplified: just split on whitespace key=value pairs
  preg_match_all('/([\\w-]+)=(?:"([^"]*)"|\'([^\']*)\'|(\\S+))/', $text, $m, PREG_SET_ORDER);
  foreach ($m as $pair) {
    $key = $pair[1];
    $val = !empty($pair[2]) ? $pair[2] : (!empty($pair[3]) ? $pair[3] : $pair[4]);
    $atts[$key] = $val;
  }
  return $atts;
}

function do_shortcode($content) {
  global $np_shortcodes;
  if (empty($np_shortcodes)) return $content;
  $tags = implode('|', array_map('preg_quote', array_keys($np_shortcodes)));
  $pattern = '/\\[(' . $tags . ')([^\\]]*?)(?:\\/\\]|\\](?:(.*?)\\[\\/\\1\\])?)/s';
  return preg_replace_callback($pattern, function($m) use ($np_shortcodes) {
    $tag  = $m[1];
    $raw  = trim($m[2]);
    $inner = isset($m[3]) ? $m[3] : '';
    $atts = shortcode_parse_atts($raw);
    return call_user_func($np_shortcodes[$tag], $atts, $inner, $tag);
  }, $content);
}

// --- Bridge output helper ---
function np_bridge_warnings() {
  global $np_warnings;
  return $np_warnings;
}
function np_bridge_return($html, $warnings = []) {
  echo json_encode(['html' => $html, 'warnings' => array_merge(np_bridge_warnings(), $warnings)]);
}

// --- POST CONTENT ---
$postContent = "${escapedContent}";
`;
}

// ---------------------------------------------------------------------------
// Timeout helper
// ---------------------------------------------------------------------------

function createTimeout(ms: number): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("BRIDGE_TIMEOUT")), ms),
  );
}

// ---------------------------------------------------------------------------
// Core render function (ADR-017 §Entry Point)
// ---------------------------------------------------------------------------

/**
 * Render shortcodes in postContent via the PHP-WASM singleton.
 *
 * Fail-safe on every error path: html is always postContent when error is set.
 */
export async function renderShortcodes(
  input: BridgeInput,
): Promise<BridgeOutput> {
  const t0 = performance.now();
  const invocationId = input.meta?.invocationId ?? randomUUID();
  const traceId = input.meta?.traceId ?? randomUUID();

  let output: BridgeOutput;

  try {
    // --- Input validation ---
    const validation = validateInput(input);
    if (!validation.ok) {
      output = {
        html: input.postContent,
        warnings: [],
        error: "BRIDGE_INPUT_REJECTED",
      };
    } else {
      // --- PHP singleton ---
      const php = await getPhpInstance();
      if (php === null) {
        output = {
          html: input.postContent,
          warnings: [],
          error: "BRIDGE_INIT_FAILED",
        };
      } else {
        // Build code: bootstrap + pilot plugin code is injected externally;
        // the bootstrap itself just sets up the environment and $postContent.
        // The caller (pilot test) appends add_shortcode + np_bridge_return.
        // For the bridge itself, we run a default: if no shortcodes are
        // registered, np_bridge_return passes content through unchanged.
        const bootstrapCode = buildBootstrapCode(
          input.postContent,
          input.context,
        );
        const runnerCode =
          bootstrapCode +
          "\n// Default: pass through (no shortcodes registered by bridge itself)\n" +
          "np_bridge_return(do_shortcode($postContent));\n";

        // --- Timeout race (ADR-017 §Runtime Model, ADR-018 §7) ---

        const phpRunPromise: Promise<{ text: string }> = php.run({
          code: runnerCode,
        });

        const raceResult = await Promise.race([
          phpRunPromise,
          createTimeout(3000),
        ]);

        // --- Parse output ---
        const rawText = (raceResult as { text: string }).text ?? "";
        let parsed: { html?: string; warnings?: string[] } = {};
        try {
          parsed = JSON.parse(rawText) as {
            html?: string;
            warnings?: string[];
          };
        } catch {
          // PHP printed something that isn't valid JSON — fatal
          output = {
            html: input.postContent,
            warnings: [rawText.slice(0, 512)],
            error: "BRIDGE_FATAL",
          };
          emitSpanFor(t0, traceId, invocationId, input, output);
          return output;
        }

        const rawHtml = parsed.html;
        if (typeof rawHtml !== "string") {
          output = {
            html: input.postContent,
            warnings: [],
            error: "BRIDGE_FATAL",
          };
        } else {
          const warnings: string[] = (parsed.warnings ?? [])
            .slice(0, 32)
            .map((w) => String(w).slice(0, 512));
          output = { html: rawHtml, warnings, error: null };
        }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "BRIDGE_TIMEOUT") {
      output = {
        html: input.postContent,
        warnings: [`timeout invocation=${invocationId}`],
        error: "BRIDGE_TIMEOUT",
      };
    } else if (msg.includes("memory") || msg.includes("OOM")) {
      output = {
        html: input.postContent,
        warnings: [],
        error: "BRIDGE_OOM",
      };
    } else {
      output = {
        html: input.postContent,
        warnings: [msg.slice(0, 512)],
        error: "BRIDGE_FATAL",
      };
    }
  }

  emitSpanFor(t0, traceId, invocationId, input, output);
  return output;
}

function emitSpanFor(
  t0: number,
  traceId: string,
  invocationId: string,
  input: BridgeInput,
  output: BridgeOutput,
): void {
  const span: BridgeSpan = {
    event: "bridge.render",
    trace_id: traceId,
    invocation_id: invocationId,
    plugin_id: BRIDGE_PLUGIN_ID,
    shortcode_tag: detectPrimaryTag(input.postContent),
    duration_ms: Math.round(performance.now() - t0),
    input_size_bytes: Buffer.byteLength(input.postContent, "utf8"),
    output_size_bytes: Buffer.byteLength(output.html, "utf8"),
    error_code: output.error,
    warnings_count: output.warnings.length,
    timestamp: new Date().toISOString(),
  };
  emitSpan(span);
}

// ---------------------------------------------------------------------------
// Hook integration (ADR-017 §Hook Integration)
// ---------------------------------------------------------------------------

/**
 * Register the bridge as a the_content filter at priority 9.
 *
 * Per ADR-017 §Runtime Model: the heavy async PHP work is performed BEFORE
 * applyFilters at the REST handler layer. This filter entry is a sync no-op
 * anchor — it owns the the_content slot at priority 9 so other plugins can
 * reason about ordering. ADR-005 (sync filters) is preserved.
 */
export function registerBridgeHooks(registry: HookRegistry): void {
  registry.removeAllByPlugin(BRIDGE_PLUGIN_ID);

  const entry: FilterEntry<string> = {
    type: "filter",
    pluginId: BRIDGE_PLUGIN_ID,
    priority: 9,
    fn: (content) => content,
  };
  registry.addFilter("the_content", entry as FilterEntry);
}
