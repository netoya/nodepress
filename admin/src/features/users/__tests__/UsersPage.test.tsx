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
import type { WpUser, WpUserRole } from "../../../types/wp-post";
import { UsersPage } from "../UsersPage";

// ---------------------------------------------------------------------------
// Static mocks — hoisted by Vitest before imports.
// ---------------------------------------------------------------------------
const mockShow = vi.fn();

vi.mock("../../../components/ui/ToastProvider", () => ({
  useToast: () => ({ show: mockShow }),
  ToastProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const BASE = "http://localhost:3000";

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
];

// ---------------------------------------------------------------------------
// MSW node server
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get(`${BASE}/wp/v2/users`, () => {
    return HttpResponse.json(mockUsers, {
      headers: { "X-WP-Total": "3", "X-WP-TotalPages": "1" },
    });
  }),
  http.put(`${BASE}/wp/v2/users/:id`, async ({ params, request }) => {
    const id = Number(params["id"]);
    const user = mockUsers.find((u) => u.id === id);
    if (!user) {
      return HttpResponse.json(
        { code: "rest_user_invalid_id", message: "Invalid user ID." },
        { status: 404 },
      );
    }
    const body = (await request.json()) as { roles?: WpUserRole[] };
    return HttpResponse.json({ ...user, roles: body.roles ?? user.roles });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  mockShow.mockClear();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests — 4 states + role editor modal
// ---------------------------------------------------------------------------

describe("UsersPage", () => {
  it("shows loading spinner while fetching", () => {
    server.use(
      http.get(`${BASE}/wp/v2/users`, async () => {
        await new Promise(() => undefined); // never resolves
        return HttpResponse.json([]);
      }),
    );

    renderWithQuery(<UsersPage />);

    expect(
      screen.getByRole("status", { name: /loading users/i }),
    ).toBeDefined();
  });

  it("shows empty state when no users exist", async () => {
    server.use(http.get(`${BASE}/wp/v2/users`, () => HttpResponse.json([])));

    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeDefined();
    });
  });

  it("renders user table with name, email, role and registered date", async () => {
    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeDefined();
    });

    // All user names
    expect(screen.getByText("Bob Editor")).toBeDefined();
    expect(screen.getByText("Carol Author")).toBeDefined();

    // Emails
    expect(screen.getByText("alice@nodepress.dev")).toBeDefined();

    // Role badges
    expect(screen.getByText("administrator")).toBeDefined();
    expect(screen.getByText("editor")).toBeDefined();
    expect(screen.getByText("author")).toBeDefined();

    // Table caption / label
    expect(screen.getByRole("table", { name: /users/i })).toBeDefined();
  });

  it("shows error state when fetch fails with retry button", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/users`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText(/failed to load users/i).length,
      ).toBeGreaterThanOrEqual(1);
    });

    expect(
      screen.getByRole("button", { name: /retry loading users/i }),
    ).toBeDefined();
  });

  it("opens edit user modal and saves updates", async () => {
    const user = userEvent.setup();

    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice Admin")).toBeDefined();
    });

    // Open modal for Alice via Edit button
    const editBtn = screen.getByRole("button", {
      name: /edit user alice admin/i,
    });
    await user.click(editBtn);

    // Modal is visible
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();
    // Check modal title
    expect(screen.getByRole("heading", { name: /edit user/i })).toBeDefined();

    // Save without changes
    const saveBtn = screen.getByRole("button", { name: /^save$/i });
    await user.click(saveBtn);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Toast fired
    expect(mockShow).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        message: expect.stringContaining("updated successfully"),
      }),
    );
  });

  it("closes modal when Cancel is clicked without updating user", async () => {
    const user = userEvent.setup();

    renderWithQuery(<UsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Bob Editor")).toBeDefined();
    });

    const editBtn = screen.getByRole("button", {
      name: /edit user bob editor/i,
    });
    await user.click(editBtn);

    expect(screen.getByRole("dialog")).toBeDefined();

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    // Role badge unchanged
    expect(screen.getByText("editor")).toBeDefined();
    expect(mockShow).not.toHaveBeenCalled();
  });
});
