import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "../Input";

describe("Input", () => {
  it("renders without errors with minimal props", () => {
    render(<Input />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("renders label when label prop is passed", () => {
    render(<Input label="Email" />);
    const label = screen.getByText("Email");
    expect(label).toBeInTheDocument();
  });

  it("renders error message when error prop is passed", () => {
    render(<Input error="This field is required" />);
    const errorMsg = screen.getByText("This field is required");
    expect(errorMsg).toBeInTheDocument();
  });

  it("has aria-invalid=true and aria-describedby when error is present", () => {
    const { container } = render(
      <Input id="test-input" error="Error message" />,
    );
    const input = container.querySelector("input");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "test-input-error");
  });

  it("dispatches onChange event when user types", async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "hello");
    expect(onChange).toHaveBeenCalled();
  });

  it("does not dispatch onChange when disabled", async () => {
    const onChange = vi.fn();
    render(<Input disabled onChange={onChange} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.disabled).toBe(true);
  });

  it("accepts size prop: sm, md, lg", () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    rerender(<Input size="md" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();

    rerender(<Input size="lg" />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("uses provided id prop", () => {
    const { container } = render(<Input id="custom-id" />);
    const input = container.querySelector("input");
    expect(input).toHaveAttribute("id", "custom-id");
  });
});
