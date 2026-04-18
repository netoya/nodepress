import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import React from "react";
import { TaxonomySelector } from "../TaxonomySelector";
import type { WpTerm } from "../../types/wp-post";

// ---------------------------------------------------------------------------
// Mock Spinner — avoid Radix/dual-React issues in test env
// ---------------------------------------------------------------------------
vi.mock("../ui/Spinner", () => ({
  Spinner: ({ label }: { label?: string }) =>
    React.createElement("span", { "aria-label": label ?? "loading" }, "…"),
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

function renderWithProviders(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const BASE = "http://localhost:3000";

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
];

// ---------------------------------------------------------------------------
// MSW server
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get(`${BASE}/wp/v2/categories`, () => HttpResponse.json(mockCategories)),
  http.get(`${BASE}/wp/v2/tags`, () => HttpResponse.json(mockTags)),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("TaxonomySelector — categories", () => {
  it("renders loaded items as checkboxes", async () => {
    renderWithProviders(
      <TaxonomySelector
        taxonomy="categories"
        selected={[]}
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/uncategorized/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/tutorials/i)).toBeInTheDocument();
  });

  it("shows loading state while fetching", () => {
    // Use a handler that never resolves to keep the loading state
    server.use(
      http.get(`${BASE}/wp/v2/categories`, () => new Promise(() => {})),
    );

    renderWithProviders(
      <TaxonomySelector
        taxonomy="categories"
        selected={[]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/loading categories/i)).toBeInTheDocument();
  });

  it("shows empty state when no terms exist", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/categories`, () => HttpResponse.json([])),
    );

    renderWithProviders(
      <TaxonomySelector
        taxonomy="categories"
        selected={[]}
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("taxonomy-empty-categories"),
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("calls onChange with updated IDs when a checkbox is toggled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <TaxonomySelector
        taxonomy="categories"
        selected={[]}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/uncategorized/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/uncategorized/i));

    expect(onChange).toHaveBeenCalledWith([1]);
  });

  it("removes ID from selection when already-checked item is toggled", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <TaxonomySelector
        taxonomy="categories"
        selected={[1, 2]}
        onChange={onChange}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/uncategorized/i)).toBeInTheDocument();
    });

    // Both should be checked
    expect(screen.getByLabelText(/uncategorized/i)).toBeChecked();
    expect(screen.getByLabelText(/tutorials/i)).toBeChecked();

    // Toggle off "Uncategorized"
    await user.click(screen.getByLabelText(/uncategorized/i));

    expect(onChange).toHaveBeenCalledWith([2]);
  });
});

describe("TaxonomySelector — tags", () => {
  it("renders tag terms as checkboxes", async () => {
    renderWithProviders(
      <TaxonomySelector taxonomy="tags" selected={[]} onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/nodejs/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/typescript/i)).toBeInTheDocument();
  });

  it("shows empty state when no tags exist", async () => {
    server.use(http.get(`${BASE}/wp/v2/tags`, () => HttpResponse.json([])));

    renderWithProviders(
      <TaxonomySelector taxonomy="tags" selected={[]} onChange={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("taxonomy-empty-tags")).toBeInTheDocument();
    });

    expect(screen.getByText(/no tags yet/i)).toBeInTheDocument();
  });
});
