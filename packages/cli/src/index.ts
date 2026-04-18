#!/usr/bin/env node

/**
 * NodePress CLI — entry point.
 *
 * Usage:
 *   nodepress serve           — Start the Fastify server (default port 3000)
 *   nodepress migrate         — Run database migrations
 *   nodepress import-wp       — Import WordPress content (stub)
 *   nodepress --help          — Show this message
 *   nodepress --version       — Show version
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
let version = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, "../../cli/package.json"), "utf-8"),
  );
  version = pkg.version || "0.1.0";
} catch {
  // Ignore — use fallback
}

// Parse argv: argv[0]=node, argv[1]=script, argv[2...]=args
const args = process.argv.slice(2);
const command = args[0];

// ---

async function serveCommand(): Promise<void> {
  try {
    const { buildServer } = await import("@nodepress/server");
    const server = await buildServer();
    const port = Number(process.env["PORT"] ?? 3000);
    await server.listen({ port, host: "0.0.0.0" });
    console.log(`NodePress server listening on http://0.0.0.0:${port}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] serve command failed: ${msg}`);
    process.exit(1);
  }
}

async function migrateCommand(): Promise<void> {
  try {
    // Trigger drizzle migrate via the db package's script
    const { execSync } = await import("child_process");
    execSync("npm run migrate --workspace=@nodepress/db", {
      stdio: "inherit",
    });
    console.log("Database migration completed");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[ERROR] migrate command failed: ${msg}`);
    process.exit(1);
  }
}

async function importWpCommand(argv: string[]): Promise<void> {
  try {
    const { importWpCommand: realImportWpCommand } =
      await import("./commands/import-wp/index.js");
    await realImportWpCommand(argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[import-wp] ${msg}`);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
NodePress ${version}

Usage:
  nodepress serve           Start the Fastify server (default port 3000)
  nodepress migrate         Run database migrations
  nodepress import-wp       Import WordPress WXR content
  nodepress plugin          Manage plugins
  nodepress --help          Show this message
  nodepress --version       Show version

Environment Variables:
  PORT                  Server port (default: 3000)
  DATABASE_URL          Database connection string
  NODEPRESS_DEMO_MODE   Enable demo mode (true/false)
  NODEPRESS_TIER2       Enable Tier 2 bridge (true/false)
  NODEPRESS_PLUGINS_DIR Plugins directory (default: ./plugins)
`);
}

function showVersion(): void {
  console.log(`NodePress ${version}`);
}

// ---

async function pluginCommand(argv: string[]): Promise<void> {
  const subcommand = argv[0];

  if (!subcommand || subcommand === "--help" || subcommand === "-h") {
    showPluginHelp();
    process.exit(0);
  }

  if (subcommand === "list") {
    const { listPlugins } = await import("./commands/plugin/index.js");
    await listPlugins();
  } else {
    console.error(`Unknown plugin subcommand: ${subcommand}`);
    showPluginHelp();
    process.exit(1);
  }
}

function showPluginHelp(): void {
  console.log(`
NodePress plugin — Manage NodePress plugins

Usage:
  nodepress plugin list         List installed plugins
  nodepress plugin --help       Show this message

Environment Variables:
  NODEPRESS_PLUGINS_DIR        Plugins directory (default: ./plugins)
`);
}

async function main(): Promise<void> {
  if (!command || command === "--help" || command === "-h") {
    showHelp();
    process.exit(0);
  }

  if (command === "--version" || command === "-v") {
    showVersion();
    process.exit(0);
  }

  if (command === "serve") {
    await serveCommand();
  } else if (command === "migrate") {
    await migrateCommand();
  } else if (command === "import-wp") {
    await importWpCommand(args.slice(1));
  } else if (command === "plugin") {
    await pluginCommand(args.slice(1));
  } else {
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL]", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
