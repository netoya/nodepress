import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { UserEditorModal } from "../UserEditorModal";
import type { WpUser } from "../../../types/wp-post";

// Mock ToastProvider
const mockShow = vi.fn();
vi.mock("../../../components/ui/ToastProvider", () => ({
  useToast: () => ({ show: mockShow }),
  ToastProvider: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

const mockUser: WpUser = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  roles: ["editor"],
  registered_date: "2026-01-10T09:00:00.000Z",
  slug: "test-user",
};

describe("UserEditorModal", () => {
  it("renders create form with required fields", () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="create"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByRole("heading", { name: /create new user/i })).toBeDefined();
    expect(screen.getByLabelText(/display name/i)).toBeDefined();
    expect(screen.getByLabelText(/email/i)).toBeDefined();
    expect(screen.getByLabelText(/^password/i)).toBeDefined();
    expect(screen.getByLabelText(/role/i)).toBeDefined();
  });

  it("renders edit form with user data", () => {
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="edit"
        user={mockUser}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    expect(screen.getByRole("heading", { name: /edit user/i })).toBeDefined();
    const nameInput = screen.getByDisplayValue("Test User") as HTMLInputElement;
    expect(nameInput.value).toBe("Test User");
  });

  it("submits create form with required fields", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="create"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const nameInput = screen.getByLabelText(/display name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/^password/i) as HTMLInputElement;
    const saveBtn = screen.getByRole("button", { name: /^save$/i });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");
    // Skip role selection to test default role
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        displayName: "John Doe",
        email: "john@example.com",
        password: "password123",
        role: "subscriber",
      });
    });
  });

  it("submits edit form with optional password", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="edit"
        user={mockUser}
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const nameInput = screen.getByDisplayValue("Test User") as HTMLInputElement;
    const saveBtn = screen.getByRole("button", { name: /^save$/i });

    // Change name only
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Name");
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({
        displayName: "Updated Name",
        email: "test@example.com",
        role: "editor",
      });
    });
  });

  it("shows validation error for missing display name", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="create"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const saveBtn = screen.getByRole("button", { name: /^save$/i });

    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");
    await user.click(saveBtn);

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("closes modal when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="create"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("disables form during submission", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100)),
    );
    const onClose = vi.fn();

    render(
      <UserEditorModal
        mode="create"
        onClose={onClose}
        onSuccess={onSuccess}
      />,
    );

    const nameInput = screen.getByLabelText(/display name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const saveBtn = screen.getByRole("button", { name: /^save$/i });

    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(passwordInput, "password123");
    await user.click(saveBtn);

    expect(saveBtn).toHaveAttribute("disabled");
  });
});
