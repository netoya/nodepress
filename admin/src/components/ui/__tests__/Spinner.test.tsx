import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Spinner } from "../Spinner";

describe("Spinner", () => {
  it("renders with role='status'", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has default aria-label 'Loading'", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Loading");
  });

  it("accepts custom aria-label", () => {
    render(<Spinner label="Loading data..." />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveAttribute("aria-label", "Loading data...");
  });

  it("applies sm size styles", () => {
    render(<Spinner size="sm" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveStyle("width: 16px");
    expect(spinner).toHaveStyle("height: 16px");
  });

  it("applies md size styles (default)", () => {
    render(<Spinner size="md" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveStyle("width: 24px");
    expect(spinner).toHaveStyle("height: 24px");
  });

  it("applies lg size styles", () => {
    render(<Spinner size="lg" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveStyle("width: 32px");
    expect(spinner).toHaveStyle("height: 32px");
  });

  it("accepts custom className", () => {
    render(<Spinner className="custom-spinner" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("custom-spinner");
  });
});
