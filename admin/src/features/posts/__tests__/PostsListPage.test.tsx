import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { PostsListPage } from "../PostsListPage";
import type { WpPost } from "../../../types/wp-post";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const BASE = "http://localhost:3000";

const mockPosts: WpPost[] = [
  {
    id: 1,
    date: "2026-04-15T10:00:00.000Z",
    slug: "hello-world",
    status: "publish",
    title: { rendered: "Hello World" },
    content: { rendered: "<p>Welcome to NodePress.</p>" },
    author: 1,
  },
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    slug: "getting-started",
    status: "draft",
    title: { rendered: "Getting Started" },
    content: { rendered: "<p>Guide.</p>" },
    author: 1,
  },
  {
    id: 3,
    date: "2026-04-17T08:00:00.000Z",
    slug: "pending-post",
    status: "pending",
    title: { rendered: "Pending Review" },
    content: { rendered: "<p>Waiting for approval.</p>" },
    author: 1,
  },
];

// ---------------------------------------------------------------------------
// MSW node server
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests — 4 states
// ---------------------------------------------------------------------------

describe("PostsListPage", () => {
  it("data state: renders table with posts from MSW", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts`, () =>
        HttpResponse.json(mockPosts, {
          headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        }),
      ),
    );

    renderWithQuery(<PostsListPage />);

    // Page heading and Add new button are always visible
    expect(screen.getByRole("heading", { name: "Posts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add new" })).toBeInTheDocument();

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    // All 3 posts rendered
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();

    // Table columns present
    expect(
      screen.getByRole("columnheader", { name: "Title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Actions" }),
    ).toBeInTheDocument();
  });

  it("loading state: shows spinner while fetching", () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts`, async () => {
        await new Promise(() => {
          // intentionally never resolves
        });
        return HttpResponse.json([]);
      }),
    );

    renderWithQuery(<PostsListPage />);

    // Spinner present during loading
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading posts")).toBeInTheDocument();
  });

  it("empty state: shows EmptyState with CTA when no posts", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts`, () =>
        HttpResponse.json([], {
          headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        }),
      ),
    );

    renderWithQuery(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByText("No posts yet")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Create first post" }),
    ).toBeInTheDocument();
  });

  it("error state: shows error message and retry button that refetches", async () => {
    let callCount = 0;

    server.use(
      http.get(`${BASE}/wp/v2/posts`, () => {
        callCount += 1;
        if (callCount === 1) {
          return HttpResponse.json(
            { code: "internal_error", message: "Server error" },
            { status: 500 },
          );
        }
        return HttpResponse.json(mockPosts, {
          headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        });
      }),
    );

    renderWithQuery(<PostsListPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load posts")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", {
      name: "Retry loading posts",
    });
    expect(retryButton).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });
    expect(callCount).toBeGreaterThanOrEqual(2);
  });
});
