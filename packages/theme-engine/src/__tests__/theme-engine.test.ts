import { describe, expect, it } from "vitest";
import { InlineThemeEngine, type ThemeEngine } from "../index.js";

describe("InlineThemeEngine", () => {
  const engine: ThemeEngine = new InlineThemeEngine();

  it("render('single', {...}) includes the post title and content", async () => {
    const html = await engine.render("single", {
      title: "Hello NodePress",
      content: "<p>First body paragraph.</p>",
    });

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Hello NodePress");
    expect(html).toContain("<p>First body paragraph.</p>");
    expect(html).toContain("<article>");
  });

  it("render('single', {}) falls back to 'Untitled' with empty content", async () => {
    const html = await engine.render("single", {});

    expect(html).toContain("Untitled");
    expect(html).toContain('<div class="content"></div>');
  });

  it("render('archive', {...}) renders one <li><a> per post with href and title", async () => {
    const html = await engine.render("archive", {
      posts: [
        { title: "First post", slug: "first-post" },
        { title: "Second post", slug: "second-post" },
      ],
    });

    expect(html).toContain("<h1>Posts</h1>");
    expect(html).toContain('<li><a href="/p/first-post">First post</a></li>');
    expect(html).toContain('<li><a href="/p/second-post">Second post</a></li>');
  });

  it("render('archive', { posts: [] }) renders an empty list", async () => {
    const html = await engine.render("archive", { posts: [] });

    expect(html).toContain("<ul></ul>");
  });

  it("render('unknown-template', {...}) returns JSON fallback wrapped in <pre>", async () => {
    const html = await engine.render("not-a-real-template", {
      foo: "bar",
      n: 42,
    });

    expect(html).toContain("<html>");
    expect(html).toContain("<pre>");
    // JSON.stringify with 2-space indent is stable; assert shape.
    expect(html).toContain('"foo": "bar"');
    expect(html).toContain('"n": 42');
  });

  it("render is async and always returns a Promise<string>", () => {
    const result = engine.render("single", { title: "sync-check" });
    expect(result).toBeInstanceOf(Promise);
  });
});
