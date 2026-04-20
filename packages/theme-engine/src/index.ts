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

/**
 * Design tokens from admin/src/styles/tokens.css
 * Injected into public-facing templates for consistent styling.
 * Ref: docs/design/public-frontend-spec.md
 */
function getDesignTokensCSS(): string {
  return `
    :root {
      /* Colors — Primary (Deep Violet) */
      --color-primary-50: #f0effe;
      --color-primary-200: #c2bcf8;
      --color-primary-300: #9b91f3;
      --color-primary-400: #7b6ff0;
      --color-primary-500: #5b4cf5;
      --color-primary-600: #4a3ce4;
      --color-primary-700: #3b2ec0;

      /* Colors — Neutral (Slate Violet) */
      --color-neutral-0: #ffffff;
      --color-neutral-50: #f8f7ff;
      --color-neutral-100: #f0eff8;
      --color-neutral-200: #e4e2f0;
      --color-neutral-300: #c9c6dc;
      --color-neutral-400: #9e9bb8;
      --color-neutral-500: #6e6b8a;
      --color-neutral-600: #4e4c6a;
      --color-neutral-700: #35334f;
      --color-neutral-800: #1e1d35;

      /* Typography — Font Families */
      --font-family-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --font-family-mono: "JetBrains Mono", "Fira Code", "Cascadia Code", monospace;

      /* Typography — Font Sizes */
      --font-size-xs: 0.75rem;
      --font-size-sm: 0.875rem;
      --font-size-base: 1rem;
      --font-size-md: 1.125rem;
      --font-size-lg: 1.25rem;
      --font-size-xl: 1.5rem;
      --font-size-2xl: 1.875rem;
      --font-size-3xl: 2.25rem;

      /* Typography — Font Weights */
      --font-weight-regular: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --font-weight-bold: 700;

      /* Spacing */
      --space-0: 0rem;
      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-3: 0.75rem;
      --space-4: 1rem;
      --space-5: 1.25rem;
      --space-6: 1.5rem;
      --space-8: 2rem;
      --space-10: 2.5rem;
      --space-12: 3rem;
      --space-16: 4rem;
      --space-20: 5rem;

      /* Border Radius */
      --radius-md: 6px;
      --radius-full: 9999px;

      /* Line Heights */
      --line-height-tight: 1.25;
      --line-height-snug: 1.375;
      --line-height-normal: 1.5;
      --line-height-relaxed: 1.625;

      /* Letter Spacing */
      --letter-spacing-tight: -0.025em;

      /* Shadows */
      --shadow-focus: 0 0 0 3px rgba(91, 76, 245, 0.35);

      /* Transitions */
      --transition-base: 150ms ease-out;
    }
  `;
}

/**
 * Global styles for public-facing pages.
 * Includes reset, base typography, and layout structure.
 */
function getGlobalCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      font-family: var(--font-family-ui);
      line-height: var(--line-height-normal);
      color: var(--color-neutral-800);
      background: var(--color-neutral-50);
    }

    body {
      background: var(--color-neutral-0);
    }

    /* Page container — content centering with max-width */
    .np-page {
      max-width: 720px;
      margin-inline: auto;
      padding-inline: var(--space-6);
    }

    @media (max-width: 640px) {
      .np-page {
        padding-inline: var(--space-4);
      }
    }

    /* Navigation */
    nav {
      padding-block: var(--space-4);
      margin-bottom: var(--space-8);
      border-bottom: 1px solid var(--color-neutral-200);
    }

    nav a {
      font-size: var(--font-size-sm);
      color: var(--color-neutral-500);
      text-decoration: none;
      transition: color var(--transition-base);
    }

    nav a:hover {
      color: var(--color-primary-600);
    }

    /* Header — archive page */
    header {
      padding-block: var(--space-8) var(--space-6);
      border-bottom: 1px solid var(--color-neutral-200);
      margin-bottom: var(--space-10);
    }

    header h1 {
      font-size: var(--font-size-2xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-neutral-800);
      margin-bottom: var(--space-1);
    }

    header p {
      font-size: var(--font-size-sm);
      color: var(--color-neutral-400);
    }

    /* Single post — article title */
    article h1 {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-neutral-800);
      line-height: var(--line-height-tight);
      margin-bottom: var(--space-6);
    }

    /* Main content area */
    .content {
      line-height: var(--line-height-relaxed);
      color: var(--color-neutral-800);
      margin: var(--space-6) 0;
    }

    /* Headings within content */
    .content h2 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-neutral-800);
      line-height: var(--line-height-snug);
      margin-top: var(--space-8);
      margin-bottom: var(--space-4);
    }

    .content h3 {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-neutral-800);
      line-height: var(--line-height-snug);
      margin-top: var(--space-6);
      margin-bottom: var(--space-3);
    }

    /* Paragraphs — body copy */
    .content p {
      font-size: var(--font-size-md);
      line-height: var(--line-height-relaxed);
      margin-bottom: var(--space-4);
    }

    /* Links */
    a {
      color: var(--color-primary-600);
      text-decoration: none;
      transition: color var(--transition-base);
    }

    a:hover {
      color: var(--color-primary-700);
    }

    a:visited {
      color: var(--color-primary-700);
    }

    /* Focus visible for keyboard navigation */
    a:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      box-shadow: var(--shadow-focus);
    }

    /* Inline code */
    code {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      background: var(--color-neutral-100);
      padding: var(--space-1) var(--space-2);
      border-radius: var(--radius-md);
      color: var(--color-neutral-800);
    }

    /* Code blocks */
    pre {
      font-family: var(--font-family-mono);
      font-size: var(--font-size-sm);
      background: var(--color-neutral-100);
      border-radius: var(--radius-md);
      padding: var(--space-4);
      overflow-x: auto;
      margin: var(--space-4) 0;
      line-height: var(--line-height-normal);
    }

    pre code {
      background: none;
      padding: 0;
      border-radius: 0;
    }

    /* Blockquotes */
    blockquote {
      border-left: 3px solid var(--color-primary-300);
      margin-inline: 0;
      padding-left: var(--space-6);
      color: var(--color-neutral-600);
      font-style: italic;
      margin-block: var(--space-6);
    }

    /* Footnotes section */
    .footnotes {
      margin-top: var(--space-8);
      padding-top: var(--space-4);
      border-top: 1px solid var(--color-neutral-200);
      font-size: var(--font-size-sm);
      color: var(--color-neutral-500);
    }

    .footnotes ol {
      padding-left: var(--space-6);
    }

    .footnotes li {
      margin-bottom: var(--space-3);
    }

    /* Footnote reference superscript */
    sup.footnote-ref a {
      color: var(--color-primary-600);
      text-decoration: none;
      font-size: 0.75em;
    }

    sup.footnote-ref a:hover {
      text-decoration: underline;
    }

    /* Footnote backref */
    .footnote-backref {
      color: var(--color-neutral-400);
      text-decoration: none;
      transition: color var(--transition-base);
    }

    .footnote-backref:hover {
      color: var(--color-primary-600);
    }

    /* Note shortcode [su_note] */
    .su-note {
      background: var(--color-primary-50);
      border-left: 4px solid var(--color-primary-400);
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-6);
      margin-block: var(--space-6);
      font-size: var(--font-size-base);
      color: var(--color-neutral-800);
      line-height: var(--line-height-relaxed);
    }

    /* Button shortcode [su_button] */
    .su-button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      background: var(--color-primary-500);
      color: var(--color-neutral-0);
      border-radius: var(--radius-full);
      padding-block: var(--space-2);
      padding-inline: var(--space-6);
      font-size: var(--font-size-sm);
      font-weight: var(--font-weight-semibold);
      text-decoration: none;
      border: none;
      cursor: pointer;
      transition: background var(--transition-base);
    }

    .su-button:hover {
      background: var(--color-primary-600);
    }

    .su-button:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      box-shadow: var(--shadow-focus);
    }

    .su-button:active {
      background: var(--color-primary-700);
    }

    /* Empty state */
    .np-empty-state {
      text-align: center;
      padding-block: var(--space-16);
      color: var(--color-neutral-500);
    }

    .np-empty-icon {
      font-size: 3rem;
      margin-bottom: var(--space-4);
      line-height: 1;
      display: block;
    }

    .np-empty-state h2 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-neutral-700);
      margin-bottom: var(--space-2);
      margin-top: 0;
    }

    .np-empty-state p {
      font-size: var(--font-size-base);
      color: var(--color-neutral-400);
      margin: 0;
    }

    /* Archive post list */
    main ul {
      list-style: none;
      margin-bottom: var(--space-8);
    }

    main ul li {
      margin-bottom: var(--space-4);
      padding: var(--space-4);
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-md);
      background: var(--color-neutral-50);
    }

    main ul li a {
      font-size: var(--font-size-lg);
      font-weight: var(--font-weight-semibold);
      color: var(--color-primary-600);
    }

    main ul li time {
      display: block;
      font-size: var(--font-size-sm);
      color: var(--color-neutral-500);
      margin-top: var(--space-2);
    }

    /* 404 page styles */
    .not-found {
      text-align: center;
      padding-block: var(--space-16) var(--space-12);
    }

    .not-found .np-404-number {
      font-size: var(--font-size-3xl);
      font-weight: var(--font-weight-bold);
      color: var(--color-neutral-300);
      letter-spacing: var(--letter-spacing-tight);
      margin-bottom: var(--space-4);
    }

    .not-found h2 {
      font-size: var(--font-size-xl);
      font-weight: var(--font-weight-semibold);
      color: var(--color-neutral-700);
      margin-bottom: var(--space-2);
      margin-top: 0;
    }

    .not-found p {
      font-size: var(--font-size-base);
      color: var(--color-neutral-500);
      margin-bottom: var(--space-6);
    }

    .not-found a {
      color: var(--color-primary-600);
      font-weight: var(--font-weight-medium);
    }

    /* Footer */
    footer {
      margin-top: var(--space-12);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-neutral-200);
      text-align: center;
      font-size: var(--font-size-xs);
      color: var(--color-neutral-400);
    }
  `;
}

function renderSinglePost(ctx: Record<string, unknown>): string {
  const title = (ctx["title"] as string) ?? "Untitled";
  const content = (ctx["content"] as string) ?? "";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${title} — NodePress</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${getDesignTokensCSS()}
    ${getGlobalCSS()}
  </style>
</head>
<body>
<div class="np-page">
  <nav><a href="/">← Back to home</a></nav>
  <main>
    <article>
      <h1>${title}</h1>
      <div class="content">${content}</div>
    </article>
  </main>
  <footer><p>Powered by NodePress</p></footer>
</div>
</body>
</html>`;
}

function renderArchive(ctx: Record<string, unknown>): string {
  const posts =
    (ctx["posts"] as Array<{ title: string; slug: string; date?: string }>) ??
    [];

  let items: string;
  if (posts.length === 0) {
    items = `
      <div class="np-empty-state">
        <p class="np-empty-icon" aria-hidden="true">📭</p>
        <h2>Aún no hay publicaciones</h2>
        <p>Cuando publiques tu primer artículo aparecerá aquí.</p>
      </div>
    `;
  } else {
    items =
      "<ul>" +
      posts
        .map((p) => {
          const datePart = p.date
            ? `<time datetime="${p.date}">${new Date(p.date).toLocaleDateString("es-ES")}</time>`
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
  <meta name="color-scheme" content="light">
  <title>Posts — NodePress</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${getDesignTokensCSS()}
    ${getGlobalCSS()}
  </style>
</head>
<body>
<div class="np-page">
  <header>
    <h1>NodePress</h1>
    <p>Open-source WordPress-compatible CMS</p>
  </header>
  <main>
    ${items}
  </main>
  <footer><p>Powered by NodePress</p></footer>
</div>
</body>
</html>`;
}
