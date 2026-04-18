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
 * Inline CSS for the 404 error page. The article/archive chrome moved to the
 * ThemeEngine in Sprint 4 (ADR-021); 404 is a server-level error response
 * and stays inline until Sprint 5 introduces template-keyed dispatch for it.
 */
const INLINE_CSS = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  html {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    background: #fafafa;
  }
  body {
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem 1rem;
    background: #fff;
  }
  header {
    margin-bottom: 3rem;
    border-bottom: 1px solid #eee;
    padding-bottom: 1rem;
  }
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }
  .tagline {
    font-size: 0.95rem;
    color: #666;
  }
  article {
    margin-bottom: 2rem;
    padding: 1.5rem;
    border: 1px solid #eee;
    border-radius: 4px;
    background: #fafafa;
  }
  article h2 {
    margin-bottom: 0.5rem;
    font-size: 1.5rem;
  }
  article h2 a {
    color: #0066cc;
    text-decoration: none;
  }
  article h2 a:hover {
    text-decoration: underline;
  }
  .meta {
    font-size: 0.85rem;
    color: #666;
    margin-bottom: 1rem;
  }
  .excerpt {
    color: #555;
    margin-bottom: 0.5rem;
  }
  .content {
    line-height: 1.8;
    margin: 1.5rem 0;
  }
  a {
    color: #0066cc;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  footer {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid #eee;
    text-align: center;
    font-size: 0.9rem;
    color: #666;
  }
  footer a {
    color: #0066cc;
  }
  .not-found {
    text-align: center;
    padding: 3rem 1rem;
  }
  .not-found h1 {
    font-size: 3rem;
    color: #ccc;
    margin-bottom: 1rem;
  }
  .not-found p {
    font-size: 1.1rem;
    color: #666;
  }
  .back-link {
    margin-top: 1.5rem;
  }
`;

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
  <title>404 Not Found</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <header>
    <h1><a href="/">NodePress</a></h1>
  </header>
  <main>
    <div class="not-found">
      <h1>404</h1>
      <p>Post not found.</p>
      <div class="back-link"><a href="/">← Back to home</a></div>
    </div>
  </main>
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
