import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        title="No posts"
        description="Create your first post to get started."
      />,
    );
    expect(screen.getByText("No posts")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first post to get started."),
    ).toBeInTheDocument();
  });

  it("does not render icon container when icon is undefined", () => {
    const { container } = render(
      <EmptyState title="No data" description="Empty state" />,
    );
    // Check that there's no icon div with the specific style
    const iconDivs = container.querySelectorAll("div");
    const hasIconContainer = Array.from(iconDivs).some(
      (div) => div.textContent === "" && div.style.width === "48px",
    );
    expect(hasIconContainer).toBe(false);
  });

  it("renders icon when provided", () => {
    render(<EmptyState title="No data" description="Empty" icon="📭" />);
    expect(screen.getByText("📭")).toBeInTheDocument();
  });

  it("does not render action container when action is undefined", () => {
    render(<EmptyState title="No data" description="Empty state" />);
    // If no action is provided, there should be no extra div for it
    const emptyStateDiv = screen.getByText("No data").closest("div");
    expect(emptyStateDiv?.querySelectorAll("div").length).toBeLessThan(5);
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        title="No data"
        description="Empty"
        action={<button>Create new</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: /create new/i }),
    ).toBeInTheDocument();
  });

  it("renders both icon and action", () => {
    render(
      <EmptyState
        title="No results"
        description="Try a different search"
        icon="🔍"
        action={<button>Go back</button>}
      />,
    );
    expect(screen.getByText("🔍")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go back/i }),
    ).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    const { container } = render(
      <EmptyState
        className="custom-empty"
        title="No data"
        description="Empty"
      />,
    );
    const emptyStateDiv = container.firstChild;
    expect(emptyStateDiv).toHaveClass("custom-empty");
  });
});
