import { render, screen, waitFor } from "@testing-library/react";
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
// vi.mock is hoisted before static imports by Vitest.
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
];

// ---------------------------------------------------------------------------
// MSW node server
// ---------------------------------------------------------------------------

const server = setupServer(
  http.get(`${BASE}/wp/v2/plugins`, () => {
    return HttpResponse.json(mockPlugins, {
      headers: { "X-WP-Total": "2", "X-WP-TotalPages": "1" },
    });
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

describe("PluginsPage", () => {
  it("shows loading spinner while fetching", () => {
    // Use an infinitely pending handler so we can catch the loading state
    server.use(
      http.get(`${BASE}/wp/v2/plugins`, async () => {
        await new Promise(() => undefined); // never resolves
        return HttpResponse.json([]);
      }),
    );

    renderWithQuery(<PluginsPage />);

    expect(
      screen.getByRole("status", { name: /loading plugins/i }),
    ).toBeDefined();
  });

  it("shows empty state when no plugins are installed", async () => {
    server.use(http.get(`${BASE}/wp/v2/plugins`, () => HttpResponse.json([])));

    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText(/no plugins installed/i)).toBeDefined();
    });
  });

  it("renders plugin list with name, version and status", async () => {
    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText("NodePress SEO")).toBeDefined();
    });

    // Both plugin names visible
    expect(screen.getByText("NodePress SEO")).toBeDefined();
    expect(screen.getByText("Contact Form Lite")).toBeDefined();

    // Version strings
    expect(screen.getByText("v1.2.0")).toBeDefined();
    expect(screen.getByText("v0.9.4")).toBeDefined();

    // Status badges
    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThanOrEqual(1);
    const inactiveBadges = screen.getAllByText("Inactive");
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows error state when fetch fails", async () => {
    server.use(
      http.get(`${BASE}/wp/v2/plugins`, () =>
        HttpResponse.json({ message: "Server error" }, { status: 500 }),
      ),
    );

    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load plugins/i)).toBeDefined();
    });

    // Retry button is accessible
    expect(
      screen.getByRole("button", { name: /retry loading plugins/i }),
    ).toBeDefined();
  });

  it("renders Uninstall button for active plugins (Sprint 7)", async () => {
    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText("NodePress SEO")).toBeDefined();
    });

    // Active plugin should have an Uninstall button
    expect(
      screen.getByRole("button", { name: /uninstall plugin nodepress seo/i }),
    ).toBeDefined();
  });

  it("renders Uninstall button for inactive plugins (Sprint 7)", async () => {
    renderWithQuery(<PluginsPage />);

    await waitFor(() => {
      expect(screen.getByText("Contact Form Lite")).toBeDefined();
    });

    // Inactive plugin should also have an Uninstall button
    expect(
      screen.getByRole("button", {
        name: /uninstall plugin contact form lite/i,
      }),
    ).toBeDefined();
  });
});
