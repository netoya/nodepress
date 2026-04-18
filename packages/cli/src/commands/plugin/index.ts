import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * List installed plugins in NODEPRESS_PLUGINS_DIR.
 *
 * Scans the plugins directory for subdirectories containing a package.json.
 * If package.json exists, reads name/version/description; otherwise uses
 * directory name as plugin name with no version.
 *
 * Prints a formatted table with plugin name, version, and status.
 * If directory is empty or missing, prints friendly message.
 */
export async function listPlugins(): Promise<void> {
  const pluginsDir = process.env["NODEPRESS_PLUGINS_DIR"] ?? "./plugins";

  // If directory doesn't exist, show friendly message
  if (!existsSync(pluginsDir)) {
    console.log("NodePress Plugins");
    console.log("─────────────────");
    console.log("No plugins directory found.");
    console.log(
      `Run: NODEPRESS_PLUGINS_DIR=./my-plugins nodepress plugin list`,
    );
    process.exit(0);
  }

  let entries: string[];
  try {
    entries = await readdir(pluginsDir);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[ERROR] failed to read plugins directory ${pluginsDir}: ${msg}`,
    );
    process.exit(1);
  }

  // Filter for directories only
  const plugins: { name: string; version: string }[] = [];

  for (const entry of entries) {
    const entryPath = join(pluginsDir, entry);
    // Simple heuristic: if it has a package.json, it's a plugin
    const pkgJsonPath = join(entryPath, "package.json");

    if (existsSync(pkgJsonPath)) {
      try {
        const pkgContent = await readFile(pkgJsonPath, "utf-8");
        const pkg = JSON.parse(pkgContent) as {
          name?: string;
          version?: string;
        };
        const name = pkg.name ?? entry;
        const version = pkg.version ?? "unknown";
        plugins.push({ name, version });
      } catch {
        // If package.json exists but is invalid, use directory name
        plugins.push({ name: entry, version: "unknown" });
      }
    }
  }

  // If no plugins found, print friendly message
  if (plugins.length === 0) {
    console.log("NodePress Plugins");
    console.log("─────────────────");
    console.log("No plugins installed.");
    console.log(
      `Run: NODEPRESS_PLUGINS_DIR=./my-plugins nodepress plugin list`,
    );
    process.exit(0);
  }

  // Print table
  console.log("NodePress Plugins");
  console.log("─────────────────────────────────────────────");
  console.log("Plugin                Version    Status");
  console.log("─────────────────────────────────────────────");

  for (const plugin of plugins) {
    // Format: left-align plugin name (20 chars), version (10 chars), status (active)
    const paddedName = plugin.name.padEnd(20);
    const paddedVersion = plugin.version.padEnd(10);
    console.log(`${paddedName}${paddedVersion}active`);
  }

  console.log("─────────────────────────────────────────────");
  console.log(
    `${plugins.length} plugin${plugins.length === 1 ? "" : "s"} installed`,
  );
}
