import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Textarea } from "../Textarea";

describe("Textarea", () => {
  it("renders without errors", () => {
    render(<Textarea />);
    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeInTheDocument();
  });

  it("renders label when label prop is passed", () => {
    render(<Textarea label="Description" />);
    const label = screen.getByText("Description");
    expect(label).toBeInTheDocument();
  });

  it("renders error message when error prop is passed", () => {
    render(<Textarea error="Too long" />);
    const errorMsg = screen.getByText("Too long");
    expect(errorMsg).toBeInTheDocument();
  });

  it("has aria-invalid=true and aria-describedby when error is present", () => {
    const { container } = render(
      <Textarea id="test-textarea" error="Error message" />,
    );
    const textarea = container.querySelector("textarea");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", "test-textarea-error");
  });

  it("has rows=4 by default", () => {
    const { container } = render(<Textarea />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toHaveAttribute("rows", "4");
  });

  it("accepts custom rows prop", () => {
    const { container } = render(<Textarea rows={8} />);
    const textarea = container.querySelector("textarea");
    expect(textarea).toHaveAttribute("rows", "8");
  });

  it("dispatches onChange event when user types", async () => {
    const onChange = vi.fn();
    render(<Textarea onChange={onChange} />);
    const textarea = screen.getByRole("textbox");
    await userEvent.type(textarea, "test text");
    expect(onChange).toHaveBeenCalled();
  });

  it("accepts autoResize prop without errors", async () => {
    const { container } = render(<Textarea autoResize={true} rows={1} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    expect(textarea).toBeInTheDocument();

    // Verify textarea still functions with autoResize enabled
    await userEvent.type(textarea, "test content");
    expect((textarea as HTMLTextAreaElement).value).toBe("test content");
  });

  it("does not resize when autoResize is false (default)", async () => {
    const { container } = render(<Textarea rows={2} />);
    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const style = window.getComputedStyle(textarea);
    expect(style.resize).toBe("vertical");
  });
});
