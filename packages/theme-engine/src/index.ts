/**
 * @nodepress/theme-engine — public entry point.
 *
 * Sprint 4 (ADR-021 Accepted): exposes the `ThemeEngine` interface and the
 * `InlineThemeEngine` MVP implementation. Full loader/resolver/renderer with
 * templates, Gutenberg, and asset pipeline land in Sprint 5+ per ADR-011.
 *
 * See {@link ./types.js} for the declarative content-model surface (post
 * types, templates, theme manifest).
 */

export type {
  PostType,
  RenderContext,
  RenderData,
  Renderer,
  Template,
  TemplateMap,
  TemplateResolver,
  Theme,
} from "./types.js";

// ---------------------------------------------------------------------------
// ThemeEngine — boundary contract (ADR-021)
// ---------------------------------------------------------------------------

/**
 * The integration boundary between the server and the theme layer. Servers
 * call {@link ThemeEngine.render} with a template slug and a context bag; the
 * engine returns the final HTML string.
 *
 * Async at the boundary even when the underlying renderer is synchronous
 * (ADR-005: sync filters at render time). The `Promise` gives room for
 * Sprint 5+ per-request data loading without breaking the handler contract.
 */
export interface ThemeEngine {
  render(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string>;
}

/**
 * Configuration for engine implementations that load templates from disk.
 * Ignored by {@link InlineThemeEngine}; reserved for the Sprint 5+ real
 * engine.
 */
export interface ThemeEngineConfig {
  templatesDir?: string;
}

/**
 * Sprint 4 MVP implementation of {@link ThemeEngine}.
 *
 * Dispatches on `templateName` via a `switch`. Supports `single` and
 * `archive` with hardcoded HTML shells; any other slug returns a JSON
 * fallback so misrouted handlers are visible during development. Full
 * template-keyed dispatch, Gutenberg, and asset bundling are Sprint 5+ per
 * ADR-011 § Scope.
 */
export class InlineThemeEngine implements ThemeEngine {
  async render(
    templateName: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    switch (templateName) {
      case "single":
        return renderSinglePost(context);
      case "archive":
        return renderArchive(context);
      default:
        return `<html><body><pre>${JSON.stringify(context, null, 2)}</pre></body></html>`;
    }
  }
}

function renderSinglePost(ctx: Record<string, unknown>): string {
  const title = (ctx["title"] as string) ?? "Untitled";
  const content = (ctx["content"] as string) ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — NodePress</title>
</head>
<body>
<nav><a href="/">← Back to home</a></nav>
<main>
<article>
  <h1>${title}</h1>
  <div class="content">${content}</div>
</article>
</main>
<footer><p>Powered by NodePress</p></footer>
</body>
</html>`;
}

function renderArchive(ctx: Record<string, unknown>): string {
  const posts =
    (ctx["posts"] as Array<{ title: string; slug: string; date?: string }>) ??
    [];

  let items: string;
  if (posts.length === 0) {
    items = "<p>No posts yet.</p>";
  } else {
    items =
      "<ul>" +
      posts
        .map((p) => {
          const datePart = p.date
            ? ` <time datetime="${p.date}">${new Date(p.date).toLocaleDateString("en-GB")}</time>`
            : "";
          return `<li><a href="/p/${p.slug}">${p.title}</a>${datePart}</li>`;
        })
        .join("\n") +
      "</ul>";
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Posts — NodePress</title>
</head>
<body>
<header>
  <h1>NodePress</h1>
  <p>Open-source WordPress-compatible CMS</p>
</header>
<main>
${items}
</main>
<footer><p>Powered by NodePress</p></footer>
</body>
</html>`;
}
