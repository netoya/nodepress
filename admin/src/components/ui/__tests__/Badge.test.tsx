import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Badge } from "../Badge";

describe("Badge", () => {
  it("renders children text correctly", () => {
    render(<Badge>New</Badge>);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("applies default variant styles", () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText("Default");
    expect(badge).toHaveStyle("background-color: var(--color-neutral-100)");
    expect(badge).toHaveStyle("color: var(--color-neutral-700)");
  });

  it("applies success variant styles", () => {
    render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText("Success");
    expect(badge).toHaveStyle("background-color: var(--color-success-100)");
    expect(badge).toHaveStyle("color: var(--color-success-700)");
  });

  it("applies warning variant styles", () => {
    render(<Badge variant="warning">Warning</Badge>);
    const badge = screen.getByText("Warning");
    expect(badge).toHaveStyle("background-color: var(--color-warning-100)");
    expect(badge).toHaveStyle("color: var(--color-warning-700)");
  });

  it("applies danger variant styles", () => {
    render(<Badge variant="danger">Danger</Badge>);
    const badge = screen.getByText("Danger");
    expect(badge).toHaveStyle("background-color: var(--color-danger-100)");
    expect(badge).toHaveStyle("color: var(--color-danger-700)");
  });

  it("applies info variant styles", () => {
    render(<Badge variant="info">Info</Badge>);
    const badge = screen.getByText("Info");
    expect(badge).toHaveStyle("background-color: var(--color-info-100)");
    expect(badge).toHaveStyle("color: var(--color-info-700)");
  });

  it("accepts custom className", () => {
    render(<Badge className="custom-class">Badge</Badge>);
    const badge = screen.getByText("Badge");
    expect(badge).toHaveClass("custom-class");
  });
});
