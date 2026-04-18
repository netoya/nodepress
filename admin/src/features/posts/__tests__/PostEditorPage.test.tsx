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
import type { WpPost } from "../../../types/wp-post";
import { PostEditorPage } from "../PostEditorPage";

// ---------------------------------------------------------------------------
// Mock modules that live in nodepress/node_modules (React 19.2.5) before they
// are imported. Admin code uses React 19.0.0 (admin/node_modules/react).
// Dynamic imports bypass Vitest's module resolver and hit Node.js native
// resolution → dual React → null dispatcher → useState crashes.
//
// Static imports (above) are resolved by Vitest/Vite AFTER these mocks apply.
// vi.mock is hoisted before all static imports by Vitest.
//
// Mocked:
//  - ToastProvider: captures show() calls via mockShow
//  - Select: plain <select> so @radix-ui/react-select never loads
// ---------------------------------------------------------------------------
const mockShow = vi.fn();

vi.mock("../../../components/ui/ToastProvider", () => ({
  useToast: () => ({ show: mockShow }),
  ToastProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// @radix-ui/react-select is resolved from nodepress/node_modules (hoisted).
// It carries its own React instance → dual-React → null dispatcher crash.
// Stub it out entirely so Select.tsx never executes Radix hooks.
vi.mock("@radix-ui/react-select", () => {
  const stub = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children ?? null);
  return {
    Root: stub,
    Trigger: stub,
    Value: stub,
    Icon: stub,
    Portal: stub,
    Content: stub,
    Viewport: stub,
    Item: stub,
    ItemText: stub,
  };
});

vi.mock("../../../components/ui/Select", () => ({
  Select: ({
    value,
    onChange,
    label,
    options,
  }: {
    value: string;
    onChange: (v: string) => void;
    label?: string;
    options: { value: string; label: string }[];
  }) =>
    React.createElement(
      "div",
      null,
      label && React.createElement("label", { htmlFor: "post-status" }, label),
      React.createElement(
        "select",
        {
          id: "post-status",
          value,
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onChange(e.target.value),
        },
        options.map((o) =>
          React.createElement(
            "option",
            { key: o.value, value: o.value },
            o.label,
          ),
        ),
      ),
    ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

const mockPost: WpPost = {
  id: 1,
  date: "2026-04-15T10:00:00.000Z",
  slug: "hello-world",
  status: "publish",
  title: { rendered: "Hello World" },
  content: { rendered: "<p>Welcome to NodePress.</p>" },
  excerpt: { rendered: "Welcome to NodePress." },
  author: 1,
};

// ---------------------------------------------------------------------------
// MSW node server
// ---------------------------------------------------------------------------

const server = setupServer(
  // TaxonomySelector fires these on mount — provide default empty handlers
  // so the form renders without MSW warnings.
  http.get(`${BASE}/wp/v2/categories`, () => HttpResponse.json([])),
  http.get(`${BASE}/wp/v2/tags`, () => HttpResponse.json([])),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  mockShow.mockClear();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PostEditorPage — new mode", () => {
  it("renders empty form with Create button", () => {
    renderWithProviders(<PostEditorPage postId={null} />);

    expect(
      screen.getByRole("heading", { name: "New post" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("");
    expect(screen.getByLabelText("Content")).toHaveValue("");
  });

  it("submit create → POST fires + show() called with success toast", async () => {
    let postedBody: Record<string, unknown> | null = null;

    server.use(
      http.post(`${BASE}/wp/v2/posts`, async ({ request }) => {
        postedBody = (await request.json()) as Record<string, unknown>;
        const created: WpPost = {
          id: 99,
          date: new Date().toISOString(),
          slug: "my-new-post",
          status: "draft",
          title: { rendered: "My New Post" },
          content: { rendered: "Some content" },
          author: 1,
        };
        return HttpResponse.json(created, { status: 201 });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<PostEditorPage postId={null} />);

    await user.type(screen.getByLabelText("Title"), "My New Post");
    await user.type(screen.getByLabelText("Content"), "Some content");
    await user.click(screen.getByRole("button", { name: "Create" }));

    // POST fired with correct payload
    await waitFor(() => {
      expect(postedBody).not.toBeNull();
    });
    expect(postedBody?.title).toBe("My New Post");

    // Success toast called
    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith({
        type: "success",
        message: "Post created",
      });
    });
  });

  it("submit error → show() called with error toast, form stays", async () => {
    server.use(
      http.post(`${BASE}/wp/v2/posts`, () => {
        return HttpResponse.json({ code: "internal_error" }, { status: 500 });
      }),
    );

    const user = userEvent.setup();
    renderWithProviders(<PostEditorPage postId={null} />);

    await user.type(screen.getByLabelText("Title"), "Broken Post");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith({
        type: "error",
        message: "Failed to create post",
      });
    });

    // Form still present — user can retry
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});

describe("PostEditorPage — edit mode", () => {
  it("renders form pre-filled with post data and Update button", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/posts/1`, () => HttpResponse.json(mockPost)),
    );

    renderWithProviders(<PostEditorPage postId={1} />);

    // Spinner visible while loading
    expect(screen.getByLabelText("Loading post")).toBeInTheDocument();

    // Form pre-filled once data arrives
    await waitFor(() => {
      expect(screen.getByLabelText("Title")).toHaveValue("Hello World");
    });

    expect(screen.getByLabelText("Content")).toHaveValue(
      "<p>Welcome to NodePress.</p>",
    );
    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Edit post" }),
    ).toBeInTheDocument();
  });
});
