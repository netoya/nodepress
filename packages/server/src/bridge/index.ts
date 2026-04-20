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
import { ACTIVE_PILOTS } from "./pilots/index.js";

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
// Guarded with function_exists() because php-wasm ships a baseline stdlib that
// pre-declares some of these; PHP does not allow redeclaring built-ins and
// would otherwise emit a fatal "Cannot redeclare" on the first invocation.
// For built-ins that survive the guard, their php-wasm sandbox implementations
// are already no-ops or return errors (no shell access inside WASM), so the
// blocking semantics are preserved even when our stub is not applied.
if (!function_exists('exec')) {
  function exec($cmd = '', &$output = null, &$return_var = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: exec';
    return '';
  }
}
if (!function_exists('system')) {
  function system($cmd = '', &$return_var = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: system';
    return '';
  }
}
if (!function_exists('shell_exec')) {
  function shell_exec($cmd = '') {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: shell_exec';
    return '';
  }
}
if (!function_exists('passthru')) {
  function passthru($cmd = '', &$return_var = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: passthru';
  }
}
if (!function_exists('popen')) {
  function popen($command = '', $mode = '') {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: popen';
    return false;
  }
}
if (!function_exists('proc_open')) {
  function proc_open($command, $descriptorspec, &$pipes, $cwd = null, $env = null, $other_options = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: proc_open';
    return false;
  }
}
if (!function_exists('mail')) {
  function mail($to = '', $subject = '', $message = '', $headers = '', $params = '') {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: mail to=' . substr($to, 0, 20);
    return false;
  }
}
if (!function_exists('curl_exec')) {
  function curl_exec($handle = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: curl_exec';
    return false;
  }
}
if (!function_exists('curl_multi_exec')) {
  function curl_multi_exec($multi_handle = null, &$still_running = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: curl_multi_exec';
    return 0;
  }
}
if (!function_exists('file_put_contents')) {
  function file_put_contents($filename = '', $data = '', $flags = 0, $context = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: file_put_contents';
    return false;
  }
}
if (!function_exists('fwrite')) {
  function fwrite($handle = null, $string = '', $length = null) {
    global $np_warnings;
    $np_warnings[] = '[BRIDGE WARN] blocked: fwrite';
    return 0;
  }
}
// --- WP HTTP API stubs (ADR-018 Amendment — Sprint 6 #83: cURL allowlist) ---
function wp_http_request($url = '', $args = []) {
  global $np_warnings, $np_curl_response;
  $method = isset($args['method']) ? $args['method'] : 'GET';
  echo '[NP_CURL_REQUEST:' . json_encode(['url' => $url, 'method' => $method]) . ']';
  // Wait for response injection on next pass.
  if (isset($np_curl_response) && !empty($np_curl_response)) {
    return ['body' => $np_curl_response, 'response' => ['code' => 200]];
  }
  return new WP_Error('np_curl_blocked', 'cURL request blocked (no allowlist or fetch pending)');
}
function wp_remote_get($url = '', $args = []) {
  global $np_warnings;
  // First attempt allowlist check.
  $response = wp_http_request($url, array_merge($args, ['method' => 'GET']));
  if (is_wp_error($response)) {
    $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_get';
    return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
  }
  return $response;
}
function wp_remote_post($url = '', $args = []) {
  global $np_warnings;
  $response = wp_http_request($url, array_merge($args, ['method' => 'POST']));
  if (is_wp_error($response)) {
    $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_post';
    return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
  }
  return $response;
}
function wp_remote_request($url = '', $args = []) {
  global $np_warnings;
  $response = wp_http_request($url, $args);
  if (is_wp_error($response)) {
    $np_warnings[] = '[BRIDGE WARN] blocked: wp_remote_request';
    return new WP_Error('http_disabled', 'Network I/O not allowed in Tier 2');
  }
  return $response;
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
  $pattern = '/([\\w-]+)\\s*=\\s*"([^"]*)"(*SKIP)(*F)|([\\w-]+)\\s*=\\s*\\'([^\\']*)\\'(*SKIP)(*F)|([\\w-]+)\\s*=\\s*(\\S+)|"([^"]*)"(*SKIP)(*F)|\\'([^\\']*)\\'(*SKIP)(*F)|([^\\s]+)/';
  preg_match_all($pattern, $text, $match);
  // Simplified: just split on whitespace key=value pairs
  preg_match_all('/([\\w-]+)=(?:"([^"]*)"|\\'([^\\']*)\\'|(\\S+))/', $text, $m, PREG_SET_ORDER);
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
// cURL allowlist configuration (ADR-018 Amendment — Sprint 6 #83)
// ---------------------------------------------------------------------------

function parseCurlAllowlist(): Set<string> {
  const env = process.env.NODEPRESS_CURL_ALLOWLIST ?? "";
  if (!env.trim()) return new Set();
  return new Set(
    env
      .split(",")
      .map((url) => url.trim())
      .filter((url) => url.length > 0),
  );
}

function isUrlAllowed(url: string, allowlist: Set<string>): boolean {
  if (allowlist.size === 0) return false;
  for (const allowedPrefix of allowlist) {
    if (url.startsWith(allowedPrefix)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// cURL request tracking (Sprint 6 #83)
// ---------------------------------------------------------------------------

interface CurlRequestMarker {
  readonly url: string;
  readonly method: "GET" | "POST";
}

/**
 * Extract NP_CURL_REQUEST markers from HTML string.
 * Format: [NP_CURL_REQUEST:{"url":"...","method":"GET"}]
 * Called AFTER JSON parsing, so no escaping issues.
 */
function extractCurlMarkers(htmlString: string): CurlRequestMarker[] {
  const markers: CurlRequestMarker[] = [];
  const regex = /\[NP_CURL_REQUEST:({[^}]*})\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(htmlString)) !== null) {
    try {
      const marker = JSON.parse(match[1]) as CurlRequestMarker;
      if (marker.url && marker.method) {
        markers.push(marker);
      }
    } catch {
      // Invalid JSON marker — skip.
    }
  }
  return markers;
}

/**
 * Process cURL requests from PHP output and re-execute with responses injected.
 * Max 3 HTTP requests per renderShortcodes() invocation (anti-loop).
 * Returns the modified runnerCode with $np_curl_response variables injected.
 */
async function processCurlRequests(
  phpOutput: string,
  runnerCode: string,
  allowlist: Set<string>,
  _invocationId: string,
  requestCount: number = 0,
): Promise<{ phpOutput: string; runnerCode: string; requestCount: number }> {
  const MAX_REQUESTS = 3;

  if (requestCount >= MAX_REQUESTS) {
    // Limit reached. Return as-is.
    return { phpOutput, runnerCode, requestCount };
  }

  const markers = extractCurlMarkers(phpOutput);
  if (markers.length === 0) {
    // No cURL requests detected.
    return { phpOutput, runnerCode, requestCount };
  }

  // Process first marker.
  const marker = markers[0];

  if (!isUrlAllowed(marker.url, allowlist)) {
    // URL not in allowlist. Inject error marker and don't retry.
    const errorMarker = `[NP_CURL_RESPONSE:{"error":"np_curl_blocked","url":"${marker.url.replace(/"/g, '\\"')}"}]`;
    const nextOutput = phpOutput.replace(
      /\[NP_CURL_REQUEST:({.*?})\]/,
      errorMarker,
    );
    // Continue processing (might have more markers).
    return processCurlRequests(
      nextOutput,
      runnerCode,
      allowlist,
      _invocationId,
      requestCount + 1,
    );
  }

  // URL is allowed. Fetch it.
  let response: string;
  try {
    const fetchRes = await fetch(marker.url, {
      method: marker.method,
      timeout: 5000,
    });
    response = await fetchRes.text();
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Inject error response.
    const errorMarker = `[NP_CURL_RESPONSE:{"error":"fetch_failed","message":"${errMsg.replace(/"/g, '\\"')}","url":"${marker.url.replace(/"/g, '\\"')}"}]`;
    const nextOutput = phpOutput.replace(
      /\[NP_CURL_REQUEST:({.*?})\]/,
      errorMarker,
    );
    return processCurlRequests(
      nextOutput,
      runnerCode,
      allowlist,
      _invocationId,
      requestCount + 1,
    );
  }

  // Inject response into runnerCode for next PHP invocation.
  const escapedResponse = response
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\$/g, "\\$")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n");

  const injectedRunnerCode =
    runnerCode + `\n$np_curl_response = "${escapedResponse}";\n`;

  // Mark the request as processed and continue.
  const nextOutput = phpOutput.replace(
    /\[NP_CURL_REQUEST:({.*?})\]/,
    `[NP_CURL_RESPONSE:{"url":"${marker.url.replace(/"/g, '\\"')}","status":"ok"}]`,
  );

  return processCurlRequests(
    injectedRunnerCode,
    nextOutput,
    allowlist,
    _invocationId,
    requestCount + 1,
  );
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
        // Build code: bootstrap + pilot PHP code + runner.
        // Per ADR-017 §Pilot Injection: each ACTIVE_PILOT's PHP code is concatenated
        // before np_bridge_return, allowing pilots to register shortcodes/filters
        // that execute when do_shortcode() runs.
        const bootstrapCode = buildBootstrapCode(
          input.postContent,
          input.context,
        );
        const pilotCode = ACTIVE_PILOTS.map((p) => p.buildPhpCode()).join("\n");
        let runnerCode =
          bootstrapCode +
          "\n" +
          pilotCode +
          "\nnp_bridge_return(do_shortcode($postContent));\n";

        // --- Timeout race (ADR-017 §Runtime Model, ADR-018 §7) ---
        // 5-second timeout: if php-wasm hangs, return content unprocessed (fail-safe).

        const phpRunPromise: Promise<{ text: string }> = php.run({
          code: runnerCode,
        });

        const raceResult = await Promise.race([
          phpRunPromise,
          createTimeout(5000),
        ]);

        // --- Parse output & handle cURL requests (Sprint 6 #83) ---
        const rawText = (raceResult as { text: string }).text ?? "";

        // Parse JSON first to extract HTML.
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
          if (process.env.NODE_ENV === "development") {
            console.error("[bridge] BRIDGE_FATAL: JSON parse error", {
              invocationId,
              rawText: rawText.slice(0, 512),
            });
          }
          emitSpanFor(t0, traceId, invocationId, input, output);
          return output;
        }

        let rawHtml = parsed.html ?? "";

        // Check for cURL requests in the parsed HTML.
        const curlAllowlist = parseCurlAllowlist();
        if (curlAllowlist.size > 0 && rawHtml.includes("[NP_CURL_REQUEST:")) {
          const curlResult = await processCurlRequests(
            rawHtml,
            runnerCode,
            curlAllowlist,
            invocationId,
          );
          if (curlResult.requestCount > 0) {
            // Re-execute PHP with injected responses.
            runnerCode = curlResult.runnerCode;
            const phpRunPromise2: Promise<{ text: string }> = php.run({
              code: runnerCode,
            });
            const raceResult2 = await Promise.race([
              phpRunPromise2,
              createTimeout(5000),
            ]);
            const rawText2 = (raceResult2 as { text: string }).text ?? "";
            try {
              parsed = JSON.parse(rawText2) as {
                html?: string;
                warnings?: string[];
              };
            } catch {
              output = {
                html: input.postContent,
                warnings: [rawText2.slice(0, 512)],
                error: "BRIDGE_FATAL",
              };
              if (process.env.NODE_ENV === "development") {
                console.error(
                  "[bridge] BRIDGE_FATAL: JSON parse error (cURL response)",
                  {
                    invocationId,
                    rawText: rawText2.slice(0, 512),
                  },
                );
              }
              emitSpanFor(t0, traceId, invocationId, input, output);
              return output;
            }
            rawHtml = parsed.html ?? "";
          }
        }

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
      if (process.env.NODE_ENV === "development") {
        console.error("[bridge] BRIDGE_FATAL:", { invocationId, error: msg });
      }
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
