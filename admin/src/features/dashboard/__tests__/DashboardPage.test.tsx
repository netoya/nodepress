import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { DashboardPage } from "../DashboardPage";
import type { WpPost } from "../../../types/wp-post";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

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
    content: { rendered: "<p>Welcome.</p>" },
    author: 1,
  },
  {
    id: 2,
    date: "2026-04-16T09:00:00.000Z",
    slug: "getting-started",
    status: "publish",
    title: { rendered: "Getting Started" },
    content: { rendered: "<p>Guide.</p>" },
    author: 1,
  },
  {
    id: 3,
    date: "2026-04-17T08:00:00.000Z",
    slug: "compat",
    status: "publish",
    title: { rendered: "WP Compatibility" },
    content: { rendered: "<p>Compat.</p>" },
    author: 1,
  },
];

// ---------------------------------------------------------------------------
// MSW Node server
// ---------------------------------------------------------------------------

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  mockNavigate.mockClear();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DashboardPage", () => {
  it("renders list of 3 posts from MSW happy path", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts`, () =>
        HttpResponse.json(mockPosts, {
          headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        }),
      ),
    );

    renderWithQuery(<DashboardPage />);

    // Posts render after loading
    await waitFor(() => {
      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("WP Compatibility")).toBeInTheDocument();
  });

  it("shows skeleton (role=status) while loading", () => {
    // Return a promise that never resolves so query stays in loading state
    server.use(
      http.get(`${BASE}/wp/v2/posts`, async () => {
        await new Promise(() => {
          // intentionally never resolves
        });
        return HttpResponse.json([]);
      }),
    );

    renderWithQuery(<DashboardPage />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading posts")).toBeInTheDocument();
  });

  it("shows EmptyState with CTA when API returns empty array", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts`, () =>
        HttpResponse.json([], {
          headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        }),
      ),
    );

    renderWithQuery(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText("No posts yet")).toBeInTheDocument();
    });
    expect(
      screen.getByRole("button", { name: "Create first post" }),
    ).toBeInTheDocument();
  });

  it("shows ErrorState with retry button that refetches on click", async () => {
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
        // Second call succeeds after retry
        return HttpResponse.json(mockPosts, {
          headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        });
      }),
    );

    renderWithQuery(<DashboardPage />);

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
