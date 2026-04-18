import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { resolve } from "path";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";

describe("CLI smoke tests", () => {
  const cliPath = resolve(__dirname, "../index.ts");

  it("shows help when invoked without arguments", () => {
    const result = execSync(`npx tsx ${cliPath}`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("NodePress");
    expect(result).toContain("serve");
    expect(result).toContain("migrate");
  });

  it("shows help with --help flag", () => {
    const result = execSync(`npx tsx ${cliPath} --help`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("Usage:");
    expect(result).toContain("serve");
  });

  it("shows version with --version flag", () => {
    const result = execSync(`npx tsx ${cliPath} --version`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("NodePress");
  });

  it("rejects unknown command", () => {
    expect(() => {
      execSync(`npx tsx ${cliPath} invalid-command`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    }).toThrow();
  });

  it("nodepress import-wp ./export.xml shows not yet implemented message", () => {
    const result = execSync(`npx tsx ${cliPath} import-wp ./export.xml`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("[import-wp]");
    expect(result).toContain("Source: ./export.xml");
    expect(result).toContain("format: wxr");
    expect(result).toContain("dry-run: false");
    expect(result).toContain("WP Import not yet implemented");
    expect(result).toContain("Coming in Sprint 5");
  });

  it("nodepress import-wp --help shows help text", () => {
    const result = execSync(`npx tsx ${cliPath} import-wp --help`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("WordPress content importer");
    expect(result).toContain("--format");
    expect(result).toContain("--dry-run");
    expect(result).toContain("Example:");
  });
});

describe("plugin command", () => {
  const cliPath = resolve(__dirname, "../index.ts");
  let tmpDir: string;

  beforeEach(() => {
    // Create a temporary directory for test plugins
    tmpDir = resolve(tmpdir(), `nodepress-test-plugins-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup temporary directory
    if (tmpDir) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("plugin --help shows help text", () => {
    const result = execSync(`npx tsx ${cliPath} plugin --help`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("NodePress plugin");
    expect(result).toContain("list");
    expect(result).toContain("NODEPRESS_PLUGINS_DIR");
  });

  it("plugin list with empty directory shows no plugins message", () => {
    const result = execSync(
      `NODEPRESS_PLUGINS_DIR=${tmpDir} npx tsx ${cliPath} plugin list`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    expect(result).toContain("NodePress Plugins");
    expect(result).toContain("No plugins installed");
  });

  it("plugin list with missing directory shows friendly message", () => {
    const missingDir = resolve(tmpDir, "nonexistent");
    const result = execSync(
      `NODEPRESS_PLUGINS_DIR=${missingDir} npx tsx ${cliPath} plugin list`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    expect(result).toContain("NodePress Plugins");
    expect(result).toContain("No plugins directory found");
  });

  it("plugin list with hello-world plugin shows it in table", () => {
    // Create a dummy plugin directory with package.json
    const pluginDir = resolve(tmpDir, "hello-world");
    mkdirSync(pluginDir);
    writeFileSync(
      resolve(pluginDir, "package.json"),
      JSON.stringify({
        name: "hello-world",
        version: "1.0.0",
        type: "module",
      }),
    );

    const result = execSync(
      `NODEPRESS_PLUGINS_DIR=${tmpDir} npx tsx ${cliPath} plugin list`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    expect(result).toContain("NodePress Plugins");
    expect(result).toContain("hello-world");
    expect(result).toContain("1.0.0");
    expect(result).toContain("active");
    expect(result).toContain("1 plugin installed");
  });

  it("plugin list with multiple plugins shows all in table", () => {
    // Create two test plugins
    const plugin1Dir = resolve(tmpDir, "plugin-one");
    const plugin2Dir = resolve(tmpDir, "plugin-two");

    mkdirSync(plugin1Dir);
    mkdirSync(plugin2Dir);

    writeFileSync(
      resolve(plugin1Dir, "package.json"),
      JSON.stringify({
        name: "plugin-one",
        version: "0.1.0",
        type: "module",
      }),
    );
    writeFileSync(
      resolve(plugin2Dir, "package.json"),
      JSON.stringify({
        name: "plugin-two",
        version: "2.0.0",
        type: "module",
      }),
    );

    const result = execSync(
      `NODEPRESS_PLUGINS_DIR=${tmpDir} npx tsx ${cliPath} plugin list`,
      {
        encoding: "utf-8",
        stdio: "pipe",
      },
    );
    expect(result).toContain("NodePress Plugins");
    expect(result).toContain("plugin-one");
    expect(result).toContain("plugin-two");
    expect(result).toContain("0.1.0");
    expect(result).toContain("2.0.0");
    expect(result).toContain("2 plugins installed");
  });

  it("plugin unknown-subcommand shows error and help", () => {
    expect(() => {
      execSync(`npx tsx ${cliPath} plugin invalid-subcommand`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    }).toThrow();
  });

  it("plugin without subcommand shows help", () => {
    const result = execSync(`npx tsx ${cliPath} plugin`, {
      encoding: "utf-8",
      stdio: "pipe",
    });
    expect(result).toContain("NodePress plugin");
    expect(result).toContain("list");
  });
});
