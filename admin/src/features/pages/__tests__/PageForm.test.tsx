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
import { PageForm, type PageFormValues } from "../PageForm";

// ---------------------------------------------------------------------------
// vi.mock — Select uses Radix under the hood; stub it to keep tests fast.
// ---------------------------------------------------------------------------
vi.mock("../../../components/ui/Select", () => ({
  Select: ({
    id,
    label,
    options,
    value,
    onChange,
    disabled,
  }: {
    id: string;
    label?: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
  }) => (
    <div>
      {label && <label htmlFor={id}>{label}</label>}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderForm(
  overrides: Partial<PageFormValues> = {},
  props: {
    onSubmit?: () => void;
    currentPageId?: number | null;
  } = {},
) {
  const defaults: PageFormValues = {
    title: "",
    slug: "",
    content: "",
    status: "draft",
    parent: 0,
    menu_order: 0,
    ...overrides,
  };
  const onChange = vi.fn();
  const onSubmit = props.onSubmit ?? vi.fn();
  const client = makeQueryClient();

  const result = render(
    <QueryClientProvider client={client}>
      <PageForm
        values={defaults}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={false}
        mode="create"
        currentPageId={props.currentPageId ?? null}
      />
    </QueryClientProvider>,
  );

  return { ...result, onChange, onSubmit };
}

const BASE = "http://localhost:3000";

const mockPages: WpPage[] = [
  {
    id: 10,
    date: "2026-04-10T10:00:00.000Z",
    slug: "about",
    status: "publish",
    title: { rendered: "About Us" },
    content: { rendered: "<p>About.</p>" },
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
    content: { rendered: "<p>Team.</p>" },
    author: 1,
    parent: 10,
    menu_order: 1,
  },
];

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PageForm", () => {
  it("renders all expected fields", () => {
    server.use(http.get(`${BASE}/wp/v2/pages`, () => HttpResponse.json([])));

    renderForm();

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Slug")).toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Parent page")).toBeInTheDocument();
    expect(screen.getByLabelText("Menu Order")).toBeInTheDocument();
    expect(screen.getByLabelText("Content")).toBeInTheDocument();
  });

  it("shows 'Create' submit button in create mode", () => {
    server.use(http.get(`${BASE}/wp/v2/pages`, () => HttpResponse.json([])));

    renderForm();

    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("parent selector does NOT include the current page being edited", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json(mockPages, {
          headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" },
        }),
      ),
    );

    // currentPageId = 10 (About Us) — should be excluded from parent options
    renderForm({}, { currentPageId: 10 });

    await waitFor(() => {
      // "Our Team" should appear (id=11, not the current page)
      expect(
        screen.getByRole("option", { name: "Our Team" }),
      ).toBeInTheDocument();
    });

    // "About Us" (id=10) should NOT appear in parent options
    expect(
      screen.queryByRole("option", { name: "About Us" }),
    ).not.toBeInTheDocument();

    // "— No parent —" always present
    expect(
      screen.getByRole("option", { name: "— No parent —" }),
    ).toBeInTheDocument();
  });

  it("parent selector includes all pages in create mode (no current page)", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/pages`, () =>
        HttpResponse.json(mockPages, {
          headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" },
        }),
      ),
    );

    renderForm({}, { currentPageId: null });

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: "About Us" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("option", { name: "Our Team" }),
      ).toBeInTheDocument();
    });
  });

  it("calls onSubmit when form is submitted", async () => {
    server.use(http.get(`${BASE}/wp/v2/pages`, () => HttpResponse.json([])));

    const onSubmit = vi.fn();
    renderForm({ title: "My Page" }, { onSubmit });

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("menu_order input accepts numeric values", async () => {
    server.use(http.get(`${BASE}/wp/v2/pages`, () => HttpResponse.json([])));

    const { onChange } = renderForm({ menu_order: 3 });

    const input = screen.getByLabelText("Menu Order") as HTMLInputElement;
    expect(input.value).toBe("3");

    const user = userEvent.setup();
    await user.clear(input);
    await user.type(input, "5");

    // onChange should have been called with "menu_order" field
    expect(onChange).toHaveBeenCalledWith("menu_order", expect.any(Number));
  });
});
