import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DarkModeToggle } from "../DarkModeToggle";

describe("DarkModeToggle", () => {
  it("should render with moon icon when light mode is active", () => {
    const mockToggle = vi.fn();
    render(<DarkModeToggle isDark={false} onToggle={mockToggle} />);

    const button = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("🌙");
  });

  it("should render with sun icon when dark mode is active", () => {
    const mockToggle = vi.fn();
    render(<DarkModeToggle isDark={true} onToggle={mockToggle} />);

    const button = screen.getByRole("button", {
      name: /switch to light mode/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("☀️");
  });

  it("should have aria-pressed set correctly", () => {
    const mockToggle = vi.fn();

    const { rerender } = render(
      <DarkModeToggle isDark={false} onToggle={mockToggle} />,
    );

    let button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "false");

    rerender(<DarkModeToggle isDark={true} onToggle={mockToggle} />);
    button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("should call onToggle when clicked", async () => {
    const mockToggle = vi.fn();
    const user = userEvent.setup();

    render(<DarkModeToggle isDark={false} onToggle={mockToggle} />);

    const button = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });

    await user.click(button);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("should call onToggle when activated with keyboard", async () => {
    const mockToggle = vi.fn();
    const user = userEvent.setup();

    render(<DarkModeToggle isDark={false} onToggle={mockToggle} />);

    const button = screen.getByRole("button", {
      name: /switch to dark mode/i,
    });

    // Focus and press Enter
    button.focus();
    await user.keyboard("{Enter}");
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });

  it("should be keyboard accessible", () => {
    const mockToggle = vi.fn();
    render(<DarkModeToggle isDark={false} onToggle={mockToggle} />);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    // Button is rendered without tabindex="-1", so it's naturally focusable
  });
});
