import { http, HttpResponse } from "msw";
import type { WpPost } from "../types/wp-post";

const BASE_URL = "http://localhost:3000";

const mockPosts: WpPost[] = [
  {
    id: 1,
    date: "2026-04-15T10:00:00.000Z",
    modified: "2026-04-15T12:00:00.000Z",
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello World" },
    content: { rendered: "<p>Welcome to NodePress.</p>" },
    excerpt: { rendered: "Welcome to NodePress." },
    author: 1,
    _nodepress: { type: "post", menu_order: 0, meta: {} },
  },
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    modified: "2026-04-16T09:30:00.000Z",
    slug: "getting-started",
    status: "publish",
    title: { rendered: "Getting Started with NodePress" },
    content: { rendered: "<p>A guide to NodePress setup.</p>" },
    excerpt: { rendered: "A guide to NodePress setup." },
    author: 1,
    _nodepress: { type: "post", menu_order: 1, meta: {} },
  },
  {
    id: 3,
    date: "2026-04-17T08:00:00.000Z",
    modified: "2026-04-17T08:15:00.000Z",
    slug: "wordpress-compatibility",
    status: "publish",
    title: { rendered: "WordPress Compatibility Layer" },
    content: {
      rendered: "<p>How NodePress achieves WP API compatibility.</p>",
    },
    excerpt: { rendered: "How NodePress achieves WP API compatibility." },
    author: 1,
    _nodepress: { type: "post", menu_order: 2, meta: {} },
  },
  {
    id: 4,
    date: "2026-04-18T07:00:00.000Z",
    modified: "2026-04-18T07:10:00.000Z",
    slug: "hook-system-draft",
    status: "draft",
    title: { rendered: "Hook System Deep Dive (Draft)" },
    content: { rendered: "<p>Work in progress — hook system internals.</p>" },
    excerpt: { rendered: "Work in progress — hook system internals." },
    author: 1,
    _nodepress: { type: "post", menu_order: 3, meta: {} },
  },
  {
    id: 5,
    date: "2026-04-18T08:00:00.000Z",
    modified: "2026-04-18T08:05:00.000Z",
    slug: "plugin-api-pending",
    status: "pending",
    title: { rendered: "Plugin API Reference (Pending Review)" },
    content: { rendered: "<p>Awaiting editorial review before publish.</p>" },
    excerpt: { rendered: "Awaiting editorial review before publish." },
    author: 2,
    _nodepress: { type: "post", menu_order: 4, meta: {} },
  },
];

export const handlers = [
  // GET /wp/v2/posts — list posts
  http.get(`${BASE_URL}/wp/v2/posts`, () => {
    return HttpResponse.json(mockPosts, {
      headers: {
        "X-WP-Total": String(mockPosts.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // GET /wp/v2/posts/:id — single post
  http.get(`${BASE_URL}/wp/v2/posts/:id`, ({ params }) => {
    const id = Number(params["id"]);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) {
      return HttpResponse.json(
        { code: "rest_post_invalid_id", message: "Invalid post ID." },
        { status: 404 },
      );
    }
    return HttpResponse.json(post);
  }),

  // POST /wp/v2/posts — create post
  http.post(`${BASE_URL}/wp/v2/posts`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      status?: string;
    };
    const created: WpPost = {
      id: mockPosts.length + 1,
      date: new Date().toISOString(),
      slug: (body.title ?? "untitled").toLowerCase().replace(/\s+/g, "-"),
      status: (body.status as WpPost["status"]) ?? "draft",
      title: { rendered: body.title ?? "" },
      content: { rendered: body.content ?? "" },
      author: 1,
      _nodepress: { type: "post", menu_order: 0, meta: {} },
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  // PUT /wp/v2/posts/:id — update post
  http.put(`${BASE_URL}/wp/v2/posts/:id`, async ({ params, request }) => {
    const id = Number(params["id"]);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) {
      return HttpResponse.json(
        { code: "rest_post_invalid_id", message: "Invalid post ID." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Partial<{
      title: string;
      content: string;
      status: string;
    }>;
    const updated: WpPost = {
      ...post,
      ...(body.title !== undefined ? { title: { rendered: body.title } } : {}),
      ...(body.content !== undefined
        ? { content: { rendered: body.content } }
        : {}),
      ...(body.status !== undefined
        ? { status: body.status as WpPost["status"] }
        : {}),
      modified: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  // DELETE /wp/v2/posts/:id — soft delete (trash) or hard delete
  http.delete(`${BASE_URL}/wp/v2/posts/:id`, ({ params, request }) => {
    const id = Number(params["id"]);
    const post = mockPosts.find((p) => p.id === id);
    if (!post) {
      return HttpResponse.json(
        { code: "rest_post_invalid_id", message: "Invalid post ID." },
        { status: 404 },
      );
    }
    const url = new URL(request.url);
    const force = url.searchParams.get("force") === "true";
    if (force) {
      return HttpResponse.json({ deleted: true, previous: post });
    }
    return HttpResponse.json({ ...post, status: "trash" });
  }),
];
