import type { FastifyReply, FastifyRequest } from "fastify";
import { db, posts } from "@nodepress/db";
import { InlineThemeEngine } from "@nodepress/theme-engine";
import { eq } from "drizzle-orm";
import { renderShortcodes } from "../../bridge/index.js";
import "../../hooks.js";

/**
 * Module-level singleton ThemeEngine (ADR-021 Sprint 4).
 * Swap to Fastify decorator when a second engine impl lands (Sprint 5+).
 */
const engine = new InlineThemeEngine();

/**
 * Design tokens CSS for 404 page (matching InlineThemeEngine tokens).
 */
function getDesignTokensCSS(): string {
  return `
    :root {
      --color-primary-300: #9b91f3;
      --color-primary-500: #5b4cf5;
      --color-primary-600: #4a3ce4;

      --color-neutral-0: #ffffff;
      --color-neutral-50: #f8f7ff;
      --color-neutral-200: #e4e2f0;
      --color-neutral-300: #c9c6dc;
      --color-neutral-400: #9e9bb8;
      --color-neutral-500: #6e6b8a;
      --color-neutral-700: #35334f;
      --color-neutral-800: #1e1d35;

      --font-family-ui: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

      --font-size-xs: 0.75rem;
      --font-size-base: 1rem;
      --font-size-xl: 1.5rem;
      --font-size-2xl: 1.875rem;
      --font-size-3xl: 2.25rem;

      --font-weight-semibold: 600;
      --font-weight-bold: 700;
      --font-weight-medium: 500;

      --space-1: 0.25rem;
      --space-2: 0.5rem;
      --space-4: 1rem;
      --space-6: 1.5rem;
      --space-8: 2rem;
      --space-10: 2.5rem;
      --space-12: 3rem;
      --space-16: 4rem;

      --radius-md: 6px;

      --letter-spacing-tight: -0.025em;

      --shadow-focus: 0 0 0 3px rgba(91, 76, 245, 0.35);

      --transition-base: 150ms ease-out;
      --line-height-normal: 1.5;
    }
  `;
}

/**
 * Global CSS for 404 page (matching InlineThemeEngine styles).
 */
function get404CSS(): string {
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

    header a {
      color: var(--color-primary-600);
      text-decoration: none;
      transition: color var(--transition-base);
    }

    header a:hover {
      color: var(--color-primary-600);
    }

    header a:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      box-shadow: var(--shadow-focus);
    }

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
      text-decoration: none;
      transition: color var(--transition-base);
    }

    .not-found a:hover {
      text-decoration: underline;
    }

    .not-found a:focus-visible {
      outline: 2px solid var(--color-primary-500);
      outline-offset: 2px;
      box-shadow: var(--shadow-focus);
    }

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

/**
 * GET / — Home page with list of published posts.
 * Delegates HTML rendering to the ThemeEngine (ADR-021).
 */
export async function getHome(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<string> {
  // Fetch all posts and filter for published status
  const allPosts = (await db
    .select()
    .from(posts)
    .where(eq(posts.status, "publish"))) as any[];

  // Filter for published (in case mock returns all posts) and sort by createdAt DESC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const publishedPosts = allPosts.filter((p: any) => p.status === "publish");

  const sortedPosts = publishedPosts.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const postsList = sortedPosts.slice(0, 10).map((p: any) => ({
    title: p.title,
    slug: p.slug,
  }));

  const html = await engine.render("archive", { posts: postsList });

  return reply.type("text/html").send(html);
}

/**
 * GET /p/:slug — Single post page.
 * 404 if slug not found or post is not published (no draft leak).
 * Content is rendered via the_content filter hook after optional Tier 2 bridge processing.
 * When NODEPRESS_TIER2=true, pre-processes content via renderShortcodes before
 * applying the_content filter chain.
 */
export async function getPost(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<string> {
  const params = request.params as Record<string, unknown>;
  const slug = params["slug"] as string;

  const allPostsResult = (await db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))) as any[];

  // Find post by slug (mock returns all posts, so we filter)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const post = allPostsResult.find((p: any) => p.slug === slug);

  // 404 if not found or not published
  if (!post || post.status !== "publish") {
    const notFoundHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>404 Not Found — NodePress</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    ${getDesignTokensCSS()}
    ${get404CSS()}
  </style>
</head>
<body>
<div class="np-page">
  <header>
    <h1><a href="/">NodePress</a></h1>
  </header>
  <main>
    <div class="not-found">
      <div class="np-404-number">404</div>
      <h2>No hemos encontrado esta página.</h2>
      <p><a href="/">← Volver al inicio</a></p>
    </div>
  </main>
  <footer><p>Powered by NodePress</p></footer>
</div>
</body>
</html>`;

    return reply.status(404).type("text/html").send(notFoundHtml);
  }

  const hooks = request.server.hooks;

  // Pre-process content through Tier 2 bridge if active
  let contentForFilter = post.content;
  const useBridge = process.env["NODEPRESS_TIER2"] === "true";

  if (useBridge) {
    try {
      const bridgeOutput = await renderShortcodes({
        postContent: post.content,
        context: {
          postId: post.id,
          postType: post.type,
          postStatus: post.status,
        },
      });
      contentForFilter =
        bridgeOutput.error === null ? bridgeOutput.html : post.content;
    } catch {
      // Fail-safe: use original content on any bridge error
      contentForFilter = post.content;
    }
  }

  // Apply the_content filter to render content
  // (same pattern as in serialize.ts REST endpoint)
  const renderedContent = hooks.applyFilters<string>(
    "the_content",
    contentForFilter,
    post,
  );

  const html = await engine.render("single", {
    title: post.title,
    content: renderedContent,
  });

  return reply.type("text/html").send(html);
}
