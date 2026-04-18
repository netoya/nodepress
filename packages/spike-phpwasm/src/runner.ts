/**
 * Spike #25 — php-wasm runner
 * Day 1: Basic setup + ecosystem evaluation
 * Task: Initialize php-wasm, run trivial PHP, measure startup + execution
 */

// Set global PHPLoader.processId before importing
(globalThis as any).PHPLoader = { processId: process.pid };

async function main() {
  console.log("=== NodePress spike-phpwasm (Day 1) ===\n");

  try {
    console.log("1. Importing @php-wasm modules...");
    const startLoad = performance.now();

    // Use dynamic import for CommonJS module
    const phpWasm = await import("@php-wasm/node");
    const { PHP } = await import("@php-wasm/universal");
    const { loadNodeRuntime } = phpWasm;

    const loadMs = performance.now() - startLoad;
    console.log(`   ✓ Modules loaded in ${loadMs.toFixed(2)}ms\n`);

    console.log("2. Loading PHP 8.3 runtime...");
    const startRuntime = performance.now();
    const runtime = await loadNodeRuntime("8.3");
    const runtimeMs = performance.now() - startRuntime;
    console.log(`   ✓ Runtime loaded in ${runtimeMs.toFixed(2)}ms\n`);

    console.log("3. Creating PHP instance...");
    const startInit = performance.now();
    const php = new PHP(runtime);
    const initMs = performance.now() - startInit;
    console.log(`   ✓ Initialized in ${initMs.toFixed(2)}ms\n`);

    console.log("4. Running basic PHP code...");
    const code = `<?php echo "Hello from PHP-WASM!"; ?>`;
    const startExec = performance.now();
    const output = await php.runString(code);
    const execMs = performance.now() - startExec;
    console.log(`   Output: "${output}"`);
    console.log(`   Execution time: ${execMs.toFixed(2)}ms\n`);

    // Test filter/action simulation
    console.log("5. Testing hook simulation (PHP → JS bridge concept)...");
    const hookTest = `<?php
    // Simulate WP filter registration
    global $hooks;
    $hooks = [];
    
    function test_add_filter($hook, $callback) {
        global $hooks;
        $hooks[$hook] = $callback;
        return true;
    }
    
    test_add_filter('test_filter', function($value) {
        return "Modified: " . $value;
    });
    
    echo json_encode(array_keys($hooks));
    ?>`;

    const hookOutput = await php.runString(hookTest);
    console.log(`   Hook registry: ${hookOutput}`);
    console.log(`   ✓ Concept works\n`);

    console.log("=== Summary ===");
    console.log(
      `Total setup time: ${(loadMs + runtimeMs + initMs).toFixed(2)}ms`,
    );
    console.log(`Per-execution overhead: ${execMs.toFixed(2)}ms`);
    console.log("✅ Day 1 baseline achieved\n");
  } catch (error) {
    console.error("❌ Error during spike:", error);
    process.exit(1);
  }
}

main();
