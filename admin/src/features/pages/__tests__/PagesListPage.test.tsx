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
import React from "react";
import type { WpPage } from "../../../types/wp-post";
import { PagesListPage } from "../PagesListPage";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../components/ui/ToastProvider", () => ({
  useToast: () => ({ show: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const BASE = "http://localhost:3000";

const mockPages: WpPage[] = [
  {
    id: 10,
    date: "2026-04-10T10:00:00.000Z",
    slug: "about",
    status: "publish",
    title: { rendered: "About Us" },
    content: { rendered: "<p>About NodePress.</p>" },
    author: 1,
    parent: 0,
    menu_order: 0,
  },
  {
    id: 11,
    date: "2026-04-11T10:00:00.000Z",
    slug: "team",
    status: "publish",
    title: { rendered: "Our Team" },
    content: { rendered: "<p>Meet the team.</p>" },
    author: 1,
    parent: 10,
    menu_order: 1,
  },
  {
    id: 12,
    date: "2026-04-12T08:00:00.000Z",
    slug: "contact",
    status: "draft",
    title: { rendered: "Contact" },
    content: { rendered: "<p>Get in touch.</p>" },
    author: 1,
    parent: 0,
    menu_order: 2,
  },
];

// ---------------------------------------------------------------------------
// MSW node server
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

describe("PagesListPage", () => {
  it("renders table with pages from MSW", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json(mockPages, {
          headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
        }),
      ),
    );

    renderWithQuery(<PagesListPage />);

    expect(screen.getByRole("heading", { name: "Pages" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "New Page" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      // "About Us" appears in the title cell AND in the parent column for "Our Team"
      expect(screen.getAllByText("About Us").length).toBeGreaterThanOrEqual(2);
    });

    expect(screen.getByText("Our Team")).toBeInTheDocument();
    expect(screen.getByText("Contact")).toBeInTheDocument();

    // Top-level pages show — for parent column
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    // Column headers
    expect(
      screen.getByRole("columnheader", { name: "Title" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Slug" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Parent" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Menu Order" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
  });

  it("shows spinner while loading", () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, async () => {
        await new Promise(() => {
          // intentionally never resolves
        });
        return HttpResponse.json([]);
      }),
    );

    renderWithQuery(<PagesListPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading pages")).toBeInTheDocument();
  });

  it("shows EmptyState when no pages exist", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json([], {
          headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        }),
      ),
    );

    renderWithQuery(<PagesListPage />);

    await waitFor(() => {
      expect(screen.getByText("No pages yet")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Create first page" }),
    ).toBeInTheDocument();
  });

  it("shows error state with retry button", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json({ code: "error" }, { status: 500 }),
      ),
    );

    renderWithQuery(<PagesListPage />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load pages")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: "Retry loading pages" }),
    ).toBeInTheDocument();
  });

  it("clicking New Page navigates to /pages/new", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json([], {
          headers: { "X-WP-Total": "0", "X-WP-TotalPages": "0" },
        }),
      ),
    );

    renderWithQuery(<PagesListPage />);

    // Wait for empty state to appear, then click New Page button in header
    await waitFor(() => {
      expect(screen.getByText("No pages yet")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    // Header "New Page" button is always visible
    const newPageBtns = screen.getAllByRole("button", { name: "New Page" });
    await user.click(newPageBtns[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/pages/new");
  });
});
