import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Modal } from "../Modal";

describe("Modal", () => {
  it("renders with title visible", () => {
    render(
      <Modal title="Test Modal" onClose={vi.fn()}>
        <p>Content here</p>
      </Modal>,
    );
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <Modal title="My Dialog" onClose={vi.fn()}>
        <p>Inner content</p>
      </Modal>,
    );
    expect(screen.getByText("Inner content")).toBeInTheDocument();
  });

  it("has aria-modal=true on the dialog element", () => {
    render(
      <Modal title="Accessible Modal" onClose={vi.fn()}>
        <button>Action</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("aria-labelledby on dialog is connected to the title element", () => {
    render(
      <Modal title="Labelled Modal" onClose={vi.fn()}>
        <span>child</span>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const titleEl = document.getElementById(labelledById!);
    expect(titleEl).toHaveTextContent("Labelled Modal");
  });

  it("calls onClose when Escape key is pressed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="Escape Modal" onClose={onClose}>
        <button>Focus target</button>
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <Modal title="Backdrop Modal" onClose={onClose}>
        <p>content</p>
      </Modal>,
    );
    // The backdrop is the first child of the container.
    const backdrop = container.firstElementChild as HTMLElement;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("does not call onClose when dialog panel itself is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal title="No-close Modal" onClose={onClose}>
        <p>Inner</p>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    await user.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });
});
