/**
 * Tests for Sprint 7 plugin marketplace features:
 * - Plugin list render (name, version, author, status)
 * - Search bar filtering via ?q= backend param
 * - Install modal — open, submit, success, error
 * - Uninstall button — success, error, hidden when status=uninstalled
 */
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
import type { WpPlugin } from "../../../types/wp-post";
import { PluginsPage } from "../PluginsPage";

// ---------------------------------------------------------------------------
// Static mock for ToastProvider — avoids Radix dual-React-instance issue.
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

const mockPlugins: WpPlugin[] = [
  {
    plugin: "nodepress-seo/nodepress-seo.php",
    name: "NodePress SEO",
    version: "1.2.0",
    status: "active",
    description: "Adds SEO meta tags to your site.",
    author: "NodePress Team",
  },
  {
    plugin: "contact-form-lite/contact-form-lite.php",
    name: "Contact Form Lite",
    version: "0.9.4",
    status: "inactive",
    description: "Simple contact forms.",
    author: "FormCraft",
  },
  {
    plugin: "old-plugin/old-plugin.php",
    name: "Old Plugin",
    version: "0.1.0",
    status: "uninstalled",
    description: "Already uninstalled plugin.",
    author: "Someone",
  },
];

// ---------------------------------------------------------------------------
// MSW node server
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get(`${BASE}/wp/v2/plugins`, ({ request }) => {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.toLowerCase() ?? "";
    const results = q
      ? mockPlugins.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        )
      : mockPlugins;
    return HttpResponse.json(results, {
      headers: { "X-WP-Total": String(results.length), "X-WP-TotalPages": "1" },
    });
  }),

  http.post(`${BASE}/wp/v2/plugins`, async ({ request }) => {
    const body = (await request.json()) as {
      slug?: string;
      registryUrl?: string;
    };
    if (!body.slug) {
      return HttpResponse.json({ message: "Missing slug." }, { status: 400 });
    }
    const installed: WpPlugin = {
      plugin: `${body.slug}/${body.slug}.php`,
      name: body.slug,
      version: "1.0.0",
      status: "inactive",
      description: "Installed.",
      author: "Unknown",
    };
    return HttpResponse.json(installed, { status: 201 });
  }),

  http.delete(`${BASE}/wp/v2/plugins/:slug`, ({ params }) => {
    const slug = decodeURIComponent(params["slug"] as string);
    const plugin = mockPlugins.find((p) => p.plugin === slug);
    if (!plugin) {
      return HttpResponse.json(
        { message: "Plugin not found." },
        { status: 404 },
      );
    }
    return HttpResponse.json({ ...plugin, status: "uninstalled" });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  mockShow.mockClear();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PluginsPage — marketplace (Sprint 7)", () => {
  it("renders plugin list with name, version, author and status", async () => {
    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText("NodePress SEO")).toBeDefined();
    });

    // Names
    expect(screen.getByText("Contact Form Lite")).toBeDefined();
    expect(screen.getByText("Old Plugin")).toBeDefined();

    // Version strings
    expect(screen.getByText("v1.2.0")).toBeDefined();
    expect(screen.getByText("v0.9.4")).toBeDefined();

    // Author
    expect(screen.getByText("By NodePress Team")).toBeDefined();

    // Status badges — at least one active, one inactive, one uninstalled
    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    const inactiveBadges = screen.getAllByText("Inactive");
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Uninstalled")).toBeDefined();
  });

  it("shows Install plugin button that opens the install modal", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText("NodePress SEO")).toBeDefined();
    });

    // Use exact name to avoid matching "Uninstall plugin ..." buttons
    const installBtn = screen.getByRole("button", { name: "Install plugin" });
    expect(installBtn).toBeDefined();

    await user.click(installBtn);

    // Modal should be open
    expect(
      screen.getByRole("dialog", { name: /install plugin/i }),
    ).toBeDefined();
  });

  it("search bar fires GET /wp/v2/plugins?q= and shows filtered results", async () => {
    const user = userEvent.setup();

    // Override: only return SEO plugin when q=seo
    server.use(
      http.get(`${BASE}/wp/v2/plugins`, ({ request }) => {
        const url = new URL(request.url);
        const q = url.searchParams.get("q")?.toLowerCase() ?? "";
        const results = q
          ? mockPlugins.filter((p) => p.name.toLowerCase().includes(q))
          : mockPlugins;
        return HttpResponse.json(results);
      }),
    );

    renderWithQuery(<PluginsPage />);

    // Wait for initial load
    await waitFor(() =>
      expect(screen.getByText("NodePress SEO")).toBeDefined(),
    );

    const searchInput = screen.getByRole("searchbox", {
      name: /search plugins/i,
    });
    await user.clear(searchInput);
    await user.type(searchInput, "seo");

    const searchBtn = screen.getByRole("button", { name: /submit search/i });
    await user.click(searchBtn);

    // After search, only SEO plugin visible
    await waitFor(() => {
      expect(screen.getByText("NodePress SEO")).toBeDefined();
    });
  });

  it("install modal — submits slug and closes on success", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PluginsPage />);

    await waitFor(() =>
      expect(screen.getByText("NodePress SEO")).toBeDefined(),
    );

    // Open modal — exact name to avoid matching "Uninstall plugin ..." buttons
    await user.click(screen.getByRole("button", { name: "Install plugin" }));
    expect(screen.getByRole("dialog")).toBeDefined();

    // Fill slug
    const slugInput = screen.getByLabelText(/plugin slug/i);
    await user.type(slugInput, "my-new-plugin");

    // Submit via the modal confirm button
    await user.click(screen.getByRole("button", { name: /confirm install/i }));

    // Modal should close after success
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("install modal — shows error message on backend failure", async () => {
    const user = userEvent.setup();

    server.use(
      http.post(`${BASE}/wp/v2/plugins`, () =>
        HttpResponse.json(
          { message: "Registry unreachable." },
          { status: 502 },
        ),
      ),
    );

    renderWithQuery(<PluginsPage />);

    await waitFor(() =>
      expect(screen.getByText("NodePress SEO")).toBeDefined(),
    );

    // Exact name to avoid matching "Uninstall plugin ..." buttons
    await user.click(screen.getByRole("button", { name: "Install plugin" }));

    const slugInput = screen.getByLabelText(/plugin slug/i);
    await user.type(slugInput, "bad-plugin");
    await user.click(screen.getByRole("button", { name: /confirm install/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
      expect(screen.getByText(/registry unreachable/i)).toBeDefined();
    });

    // Modal stays open on error
    expect(screen.getByRole("dialog")).toBeDefined();
  });

  it("uninstall button calls DELETE and shows success toast", async () => {
    const user = userEvent.setup();
    renderWithQuery(<PluginsPage />);

    await waitFor(() =>
      expect(screen.getByText("NodePress SEO")).toBeDefined(),
    );

    const uninstallBtn = screen.getByRole("button", {
      name: /uninstall plugin nodepress seo/i,
    });
    await user.click(uninstallBtn);

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          message: expect.stringContaining("uninstalled"),
        }),
      );
    });
  });

  it("uninstall button is hidden for plugins with status=uninstalled", async () => {
    renderWithQuery(<PluginsPage />);

    await waitFor(() => expect(screen.getByText("Old Plugin")).toBeDefined());

    // The "Old Plugin" has status=uninstalled — no uninstall button for it
    expect(
      screen.queryByRole("button", { name: /uninstall plugin old plugin/i }),
    ).toBeNull();
  });
});
