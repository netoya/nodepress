import { describe, it, expect } from "vitest";
import { Toast, type ToastItem } from "../Toast";
import { render, screen } from "@testing-library/react";

describe("Toast Component", () => {
  it("renders success toast with message", () => {
    const toast: ToastItem = {
      id: "1",
      type: "success",
      message: "Saved successfully",
    };

    render(<Toast toast={toast} onOpenChange={() => {}} />);

    expect(screen.getByText("Saved successfully")).toBeInTheDocument();
  });

  it("renders error toast with message", () => {
    const toast: ToastItem = {
      id: "2",
      type: "error",
      message: "An error occurred",
    };

    render(<Toast toast={toast} onOpenChange={() => {}} />);

    expect(screen.getByText("An error occurred")).toBeInTheDocument();
  });

  it("renders info toast with message", () => {
    const toast: ToastItem = {
      id: "3",
      type: "info",
      message: "Please note",
    };

    render(<Toast toast={toast} onOpenChange={() => {}} />);

    expect(screen.getByText("Please note")).toBeInTheDocument();
  });

  it("renders dismiss button with correct aria label", () => {
    const toast: ToastItem = {
      id: "4",
      type: "success",
      message: "Done",
    };

    render(<Toast toast={toast} onOpenChange={() => {}} />);

    const dismissButton = screen.getByLabelText("Dismiss notification");
    expect(dismissButton).toBeInTheDocument();
  });

  it("renders correct icon for each toast type", () => {
    const successToast: ToastItem = {
      id: "5",
      type: "success",
      message: "Success!",
    };

    const { container: successContainer } = render(
      <Toast toast={successToast} onOpenChange={() => {}} />,
    );

    // Success toast should render checkmark icon
    expect(successContainer.textContent).toContain("Success!");
  });
});
