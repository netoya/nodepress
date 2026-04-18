/**
 * NodePress import-wp CLI command entry point.
 * Parses flags, coordinates the import pipeline.
 */

import { runImport, type ImportOptions } from "./pipeline.js";

interface ParsedArgs {
  source: string;
  dryRun: boolean;
  mode: "upsert" | "reset";
  verbose: boolean;
  format: string;
}

function parseImportWpArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    source: "",
    dryRun: false,
    mode: "upsert",
    verbose: false,
    format: "wxr",
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (!arg) continue;

    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--verbose" || arg === "-v") {
      parsed.verbose = true;
    } else if (arg === "--mode" && i + 1 < argv.length) {
      const mode = argv[i + 1];
      if (mode === "upsert" || mode === "reset") {
        parsed.mode = mode;
      }
      i++;
    } else if (arg === "--format" && i + 1 < argv.length) {
      parsed.format = argv[i + 1] || "wxr";
      i++;
    } else if (!arg.startsWith("--") && !arg.startsWith("-")) {
      // Positional argument (source)
      if (!parsed.source) {
        parsed.source = arg;
      }
    }
  }

  return parsed;
}

export async function importWpCommand(argv: string[]): Promise<void> {
  // Check for help early
  if (argv.includes("--help") || argv.includes("-h")) {
    showImportWpHelp();
    throw new Error("Help displayed");
  }

  const parsed = parseImportWpArgs(argv);

  if (!parsed.source) {
    console.error("[ERROR] import-wp requires <source> argument");
    showImportWpHelp();
    throw new Error("Missing source argument");
  }

  if (parsed.format !== "wxr") {
    console.error(
      `[ERROR] Only WXR format is supported in Sprint 5. Got: ${parsed.format}`,
    );
    throw new Error("Unsupported format");
  }

  if (parsed.mode === "reset") {
    // Prompt for confirmation
    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve, reject) => {
      rl.question(
        "WARNING: --mode=reset will truncate posts, terms, users, and comments. Continue? [y/N] ",
        async (answer) => {
          rl.close();
          if (answer.toLowerCase() !== "y") {
            console.log("Cancelled.");
            resolve();
            return;
          }
          try {
            await executeImport(parsed);
            resolve();
          } catch (err) {
            reject(err);
          }
        },
      );
    });
  } else {
    await executeImport(parsed);
  }
}

async function executeImport(parsed: ParsedArgs): Promise<void> {
  const options: ImportOptions = {
    source: parsed.source,
    dryRun: parsed.dryRun,
    mode: parsed.mode,
    verbose: parsed.verbose,
  };

  await runImport(options);

  if (!parsed.dryRun) {
    console.log("\n✓ Import successful!");
    console.log("Imported users should reset their password on first login.");
  }
}

export function showImportWpHelp(): void {
  console.log(`
NodePress import-wp — WordPress content importer

Usage:
  nodepress import-wp <source> [OPTIONS]

Arguments:
  <source>              Path to WordPress WXR export file

Options:
  --dry-run             Parse and validate without writing to DB
  --mode <mode>         upsert (default) or reset
  --format <format>     Source format: wxr (default)
  --verbose, -v         Show detailed skip reasons
  --help, -h            Show this help message

Examples:
  nodepress import-wp ./export.xml
  nodepress import-wp ./export.xml --dry-run
  nodepress import-wp ./export.xml --mode=reset

Notes:
  - Dry-run is recommended before real imports
  - --mode=reset requires interactive confirmation
  - Media/attachments are logged but not imported in Sprint 5
  - Imported users must reset their password on first login
`);
}
