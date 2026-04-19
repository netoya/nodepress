import { describe, it, expect } from "vitest";
import { pluginRatings } from "../schema/plugin-ratings.js";

describe("plugin_ratings schema", () => {
  it("has the correct table name", () => {
    // Drizzle stores the table name under the drizzle:Name symbol
    const nameSymbol = Object.getOwnPropertySymbols(pluginRatings).find(
      (s) => s.toString() === "Symbol(drizzle:Name)",
    );
    expect(nameSymbol).toBeDefined();
    expect((pluginRatings as Record<symbol, string>)[nameSymbol!]).toBe(
      "plugin_ratings",
    );
  });

  it("exposes all required columns", () => {
    const cols = Object.keys(pluginRatings);
    expect(cols).toContain("id");
    expect(cols).toContain("pluginSlug");
    expect(cols).toContain("userId");
    expect(cols).toContain("rating");
    expect(cols).toContain("review");
    expect(cols).toContain("createdAt");
    expect(cols).toContain("updatedAt");
  });

  it("id column is serial (integer)", () => {
    expect(pluginRatings.id.columnType).toBe("PgSerial");
  });

  it("pluginSlug column is text and notNull", () => {
    expect(pluginRatings.pluginSlug.columnType).toBe("PgText");
    expect(pluginRatings.pluginSlug.notNull).toBe(true);
  });

  it("userId column is text and notNull", () => {
    expect(pluginRatings.userId.columnType).toBe("PgText");
    expect(pluginRatings.userId.notNull).toBe(true);
  });

  it("rating column is integer and notNull", () => {
    expect(pluginRatings.rating.columnType).toBe("PgInteger");
    expect(pluginRatings.rating.notNull).toBe(true);
  });

  it("review column is text and nullable", () => {
    expect(pluginRatings.review.columnType).toBe("PgText");
    expect(pluginRatings.review.notNull).toBe(false);
  });

  it("createdAt has a default", () => {
    expect(pluginRatings.createdAt.hasDefault).toBe(true);
  });

  it("updatedAt has a default", () => {
    expect(pluginRatings.updatedAt.hasDefault).toBe(true);
  });
});
