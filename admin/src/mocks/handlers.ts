import { http, HttpResponse } from "msw";
import type {
  WpPage,
  WpPlugin,
  WpPost,
  WpTerm,
  WpUser,
  WpUserRole,
} from "../types/wp-post";

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

// ---------------------------------------------------------------------------
// Pages mock data — includes a child page (parent != 0) for parent selector tests.
// ---------------------------------------------------------------------------
const mockPages: WpPage[] = [
  {
    id: 10,
    date: "2026-04-10T10:00:00.000Z",
    modified: "2026-04-10T12:00:00.000Z",
    slug: "about",
    status: "publish",
    title: { rendered: "About Us" },
    content: { rendered: "<p>About NodePress.</p>" },
    author: 1,
    parent: 0,
    menu_order: 0,
    link: "http://localhost:3000/about/",
  },
  {
    id: 11,
    date: "2026-04-11T10:00:00.000Z",
    modified: "2026-04-11T10:30:00.000Z",
    slug: "team",
    status: "publish",
    title: { rendered: "Our Team" },
    content: { rendered: "<p>Meet the NodePress team.</p>" },
    author: 1,
    parent: 10,
    menu_order: 1,
    link: "http://localhost:3000/about/team/",
  },
  {
    id: 12,
    date: "2026-04-12T08:00:00.000Z",
    modified: "2026-04-12T08:15:00.000Z",
    slug: "contact",
    status: "draft",
    title: { rendered: "Contact (Draft)" },
    content: { rendered: "<p>Get in touch — coming soon.</p>" },
    author: 2,
    parent: 0,
    menu_order: 2,
    link: "http://localhost:3000/contact/",
  },
];

const mockCategories: WpTerm[] = [
  {
    id: 1,
    name: "Uncategorized",
    slug: "uncategorized",
    taxonomy: "category",
    count: 5,
  },
  {
    id: 2,
    name: "Tutorials",
    slug: "tutorials",
    taxonomy: "category",
    count: 3,
  },
  { id: 3, name: "Releases", slug: "releases", taxonomy: "category", count: 2 },
];

const mockPlugins: WpPlugin[] = [
  {
    plugin: "nodepress-seo/nodepress-seo.php",
    name: "NodePress SEO",
    version: "1.2.0",
    status: "active",
    description:
      "Adds SEO meta tags, sitemaps and structured data to your NodePress site.",
    author: "NodePress Team",
  },
  {
    plugin: "contact-form-lite/contact-form-lite.php",
    name: "Contact Form Lite",
    version: "0.9.4",
    status: "inactive",
    description: "Simple drag-and-drop contact forms with spam protection.",
    author: "FormCraft",
  },
  {
    plugin: "nodepress-analytics/nodepress-analytics.php",
    name: "NodePress Analytics",
    version: "2.0.1",
    status: "active",
    description:
      "Privacy-friendly page-view analytics dashboard integrated into the admin panel.",
    author: "NodePress Team",
  },
];

const mockTags: WpTerm[] = [
  { id: 10, name: "nodejs", slug: "nodejs", taxonomy: "post_tag", count: 4 },
  {
    id: 11,
    name: "typescript",
    slug: "typescript",
    taxonomy: "post_tag",
    count: 6,
  },
  {
    id: 12,
    name: "wordpress",
    slug: "wordpress",
    taxonomy: "post_tag",
    count: 3,
  },
  { id: 13, name: "api", slug: "api", taxonomy: "post_tag", count: 2 },
];

const mockSettings = {
  title: "NodePress",
  description: "A modern CMS platform",
  url: "http://localhost:3000",
  email: "admin@nodepress.dev",
  posts_per_page: 10,
  default_category: 1,
};

const mockUsers: WpUser[] = [
  {
    id: 1,
    name: "Alice Admin",
    email: "alice@nodepress.dev",
    roles: ["administrator"],
    registered_date: "2026-01-10T09:00:00.000Z",
    slug: "alice-admin",
  },
  {
    id: 2,
    name: "Bob Editor",
    email: "bob@nodepress.dev",
    roles: ["editor"],
    registered_date: "2026-02-14T14:30:00.000Z",
    slug: "bob-editor",
  },
  {
    id: 3,
    name: "Carol Author",
    email: "carol@nodepress.dev",
    roles: ["author"],
    registered_date: "2026-03-01T08:15:00.000Z",
    slug: "carol-author",
  },
  {
    id: 4,
    name: "Dave Subscriber",
    email: "dave@nodepress.dev",
    roles: ["subscriber"],
    registered_date: "2026-04-05T11:45:00.000Z",
    slug: "dave-subscriber",
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

  // GET /wp/v2/categories — list categories
  http.get(`${BASE_URL}/wp/v2/categories`, () => {
    return HttpResponse.json(mockCategories, {
      headers: {
        "X-WP-Total": String(mockCategories.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // GET /wp/v2/tags — list tags
  http.get(`${BASE_URL}/wp/v2/tags`, () => {
    return HttpResponse.json(mockTags, {
      headers: {
        "X-WP-Total": String(mockTags.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // GET /wp/v2/plugins — list installed plugins (Sprint 5 stub)
  http.get(`${BASE_URL}/wp/v2/plugins`, () => {
    return HttpResponse.json(mockPlugins, {
      headers: {
        "X-WP-Total": String(mockPlugins.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // GET /wp/v2/users — list users
  http.get(`${BASE_URL}/wp/v2/users`, () => {
    return HttpResponse.json(mockUsers, {
      headers: {
        "X-WP-Total": String(mockUsers.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // POST /wp/v2/users — create user
  http.post(`${BASE_URL}/wp/v2/users`, async ({ request }) => {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      roles?: WpUserRole[];
    };

    const newId = Math.max(...mockUsers.map((u) => u.id), 0) + 1;
    const created: WpUser = {
      id: newId,
      name: body.name ?? "New User",
      email: body.email ?? `user${newId}@nodepress.dev`,
      roles: body.roles ?? ["subscriber"],
      registered_date: new Date().toISOString(),
      slug: (body.name ?? "user").toLowerCase().replace(/\s+/g, "-"),
    };
    mockUsers.push(created);
    return HttpResponse.json(created, { status: 201 });
  }),

  // PUT /wp/v2/users/:id — update user
  http.put(`${BASE_URL}/wp/v2/users/:id`, async ({ params, request }) => {
    const id = Number(params["id"]);
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return HttpResponse.json(
        { code: "rest_user_invalid_id", message: "Invalid user ID." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
      roles?: WpUserRole[];
    };
    const updated: WpUser = {
      ...user,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      roles: body.roles ?? user.roles,
    };
    // Update in mockUsers array
    const idx = mockUsers.findIndex((u) => u.id === id);
    if (idx >= 0) {
      mockUsers[idx] = updated;
    }
    return HttpResponse.json(updated);
  }),

  // DELETE /wp/v2/users/:id — delete user with reassign
  http.delete(
    `${BASE_URL}/wp/v2/users/:id`,
    ({ params }) => {
      const id = Number(params["id"]);
      const user = mockUsers.find((u) => u.id === id);
      if (!user) {
        return HttpResponse.json(
          { code: "rest_user_invalid_id", message: "Invalid user ID." },
          { status: 404 },
        );
      }
      // Remove user from mockUsers
      const idx = mockUsers.findIndex((u) => u.id === id);
      if (idx >= 0) {
        mockUsers.splice(idx, 1);
      }
      return HttpResponse.json({ deleted: true, previous: user });
    },
  ),

  // ---------------------------------------------------------------------------
  // Pages handlers — GET list, GET single, POST, PUT, DELETE
  // ---------------------------------------------------------------------------

  // GET /wp/v2/pages — list pages
  http.get(`${BASE_URL}/wp/v2/pages`, () => {
    return HttpResponse.json(mockPages, {
      headers: {
        "X-WP-Total": String(mockPages.length),
        "X-WP-TotalPages": "1",
      },
    });
  }),

  // GET /wp/v2/pages/:id — single page
  http.get(`${BASE_URL}/wp/v2/pages/:id`, ({ params }) => {
    const id = Number(params["id"]);
    const page = mockPages.find((p) => p.id === id);
    if (!page) {
      return HttpResponse.json(
        { code: "rest_page_invalid_id", message: "Invalid page ID." },
        { status: 404 },
      );
    }
    return HttpResponse.json(page);
  }),

  // POST /wp/v2/pages — create page
  http.post(`${BASE_URL}/wp/v2/pages`, async ({ request }) => {
    const body = (await request.json()) as {
      title?: string;
      content?: string;
      status?: string;
      parent?: number;
      menu_order?: number;
    };
    const created: WpPage = {
      id: 100 + mockPages.length,
      date: new Date().toISOString(),
      slug: (body.title ?? "untitled").toLowerCase().replace(/\s+/g, "-"),
      status: (body.status as WpPage["status"]) ?? "draft",
      title: { rendered: body.title ?? "" },
      content: { rendered: body.content ?? "" },
      author: 1,
      parent: body.parent ?? 0,
      menu_order: body.menu_order ?? 0,
      link: `http://localhost:3000/${(body.title ?? "untitled").toLowerCase().replace(/\s+/g, "-")}/`,
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  // PUT /wp/v2/pages/:id — update page
  http.put(`${BASE_URL}/wp/v2/pages/:id`, async ({ params, request }) => {
    const id = Number(params["id"]);
    const page = mockPages.find((p) => p.id === id);
    if (!page) {
      return HttpResponse.json(
        { code: "rest_page_invalid_id", message: "Invalid page ID." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as Partial<{
      title: string;
      content: string;
      status: string;
      parent: number;
      menu_order: number;
    }>;
    const updated: WpPage = {
      ...page,
      ...(body.title !== undefined ? { title: { rendered: body.title } } : {}),
      ...(body.content !== undefined
        ? { content: { rendered: body.content } }
        : {}),
      ...(body.status !== undefined
        ? { status: body.status as WpPage["status"] }
        : {}),
      ...(body.parent !== undefined ? { parent: body.parent } : {}),
      ...(body.menu_order !== undefined ? { menu_order: body.menu_order } : {}),
      modified: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  // DELETE /wp/v2/pages/:id — simulates deletion
  http.delete(`${BASE_URL}/wp/v2/pages/:id`, ({ params }) => {
    const id = Number(params["id"]);
    const page = mockPages.find((p) => p.id === id);
    if (!page) {
      return HttpResponse.json(
        { code: "rest_page_invalid_id", message: "Invalid page ID." },
        { status: 404 },
      );
    }
    return HttpResponse.json({ deleted: true, previous: page });
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

  // GET /wp/v2/settings — get site settings
  http.get(`${BASE_URL}/wp/v2/settings`, () => {
    return HttpResponse.json(mockSettings);
  }),

  // PUT /wp/v2/settings — update site settings
  http.put(`${BASE_URL}/wp/v2/settings`, async ({ request }) => {
    const body = (await request.json()) as Partial<typeof mockSettings>;
    const updated = {
      ...mockSettings,
      ...body,
    };
    // Update mockSettings
    Object.assign(mockSettings, updated);
    return HttpResponse.json(updated);
  }),
];
