import type { FastifyReply, FastifyRequest } from "fastify";
import { db, posts } from "@nodepress/db";
import { eq } from "drizzle-orm";
import "../../hooks.js";

/**
 * HTML entities escape for safe text interpolation.
 * Only escapes <, >, &, ", and ' to prevent XSS in title and attributes.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Inline CSS for minimal styling.
 * Blog-ish appearance: centered, readable font, subtle colors.
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
 */
export async function getHome(
  request: FastifyRequest,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedPosts = publishedPosts.sort(
    (a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const postsList = sortedPosts.slice(0, 10);

  // Build article HTML for each post
  const articlesHtml = postsList
    .map((post) => {
      const excerpt =
        post.excerpt || post.content.substring(0, 200).replace(/<[^>]*>/g, "");
      const titleEscaped = escapeHtml(post.title);

      return `
    <article>
      <h2><a href="/p/${escapeHtml(post.slug)}">${titleEscaped}</a></h2>
      <div class="meta">
        <time datetime="${post.createdAt.toISOString()}">
          ${post.createdAt.toLocaleDateString()}
        </time>
        — by Author ${post.authorId}
      </div>
      <p class="excerpt">${escapeHtml(excerpt)}</p>
    </article>
  `;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NodePress</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <header>
    <h1>NodePress</h1>
    <p class="tagline">A WordPress-compatible CMS built on Node.js</p>
  </header>

  <main>
    ${articlesHtml || '<p style="text-align: center; color: #999;">No posts yet.</p>'}
  </main>

  <footer>
    <p>
      <a href="/wp/v2/posts">REST API</a> — 
      Powered by <a href="https://nodepress.example">NodePress</a>
    </p>
  </footer>
</body>
</html>`;

  return reply.type("text/html").send(html);
}

/**
 * GET /p/:slug — Single post page.
 * 404 if slug not found or post is not published (no draft leak).
 * Content is rendered via the_content filter hook.
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

  // Apply the_content filter to render content
  // (same pattern as in serialize.ts REST endpoint)
  const renderedContent = hooks.applyFilters<string>(
    "the_content",
    post.content,
    post,
  );

  const titleEscaped = escapeHtml(post.title);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleEscaped} | NodePress</title>
  <style>${INLINE_CSS}</style>
</head>
<body>
  <header>
    <h1><a href="/">NodePress</a></h1>
  </header>

  <main>
    <article>
      <h1>${titleEscaped}</h1>
      <div class="meta">
        <time datetime="${post.createdAt.toISOString()}">
          ${post.createdAt.toLocaleDateString()}
        </time>
        — by Author ${post.authorId}
      </div>
      <div class="content">
        ${renderedContent}
      </div>
    </article>
  </main>

  <footer>
    <p><a href="/">← Back to home</a></p>
    <p style="margin-top: 1rem; font-size: 0.85rem;">
      Powered by <a href="https://nodepress.example">NodePress</a>
    </p>
  </footer>
</body>
</html>`;

  return reply.type("text/html").send(html);
}
