import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Button } from "../Button";

describe("Button", () => {
  it("renders without error with default props", () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole("button", { name: /click me/i }),
    ).toBeInTheDocument();
  });

  it("applies primary variant styles by default", () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole("button", { name: /primary/i });
    expect(button).toHaveStyle("background-color: var(--color-primary-500)");
  });

  it("applies secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole("button", { name: /secondary/i });
    expect(button).toHaveStyle("background-color: var(--color-neutral-100)");
  });

  it("applies ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole("button", { name: /ghost/i });
    // Check color since transparent renders differently
    expect(button).toHaveStyle("color: var(--color-neutral-700)");
  });

  it("applies destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole("button", { name: /delete/i });
    expect(button).toHaveStyle("background-color: var(--color-danger-500)");
  });

  it("applies sm size styles", () => {
    render(<Button size="sm">Small</Button>);
    const button = screen.getByRole("button", { name: /small/i });
    expect(button).toHaveStyle("height: 32px");
  });

  it("applies md size styles (default)", () => {
    render(<Button size="md">Medium</Button>);
    const button = screen.getByRole("button", { name: /medium/i });
    expect(button).toHaveStyle("height: 40px");
  });

  it("applies lg size styles", () => {
    render(<Button size="lg">Large</Button>);
    const button = screen.getByRole("button", { name: /large/i });
    expect(button).toHaveStyle("height: 48px");
  });

  it("disables button when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button", { name: /disabled/i });
    expect(button).toBeDisabled();
  });

  it("does not trigger onClick when disabled", async () => {
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>,
    );
    const button = screen.getByRole("button", { name: /disabled/i });
    await userEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("shows spinner and disables when loading", () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole("button", { name: /loading/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("renders with asChild pattern (renders child as root)", () => {
    const { container } = render(
      <Button asChild>
        <a href="/">Link as Button</a>
      </Button>,
    );
    // When asChild=true, the <a> becomes the root element with button props
    const link = container.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
    expect(link?.textContent).toContain("Link as Button");
  });

  it("triggers onClick handler on click", async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    const button = screen.getByRole("button", { name: /click/i });
    await userEvent.click(button);
    expect(handleClick).toHaveBeenCalled();
  });
});
