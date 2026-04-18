import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { resolve } from "path";

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
