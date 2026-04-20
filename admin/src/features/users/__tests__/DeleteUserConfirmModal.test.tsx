import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { DeleteUserConfirmModal } from "../DeleteUserConfirmModal";
import type { WpUser } from "../../../types/wp-post";

const mockUser: WpUser = {
  id: 1,
  name: "Test User",
  email: "test@example.com",
  roles: ["editor"],
  registered_date: "2026-01-10T09:00:00.000Z",
  slug: "test-user",
};

const mockOtherUser: WpUser = {
  id: 2,
  name: "Other User",
  email: "other@example.com",
  roles: ["author"],
  registered_date: "2026-02-10T09:00:00.000Z",
  slug: "other-user",
};

describe("DeleteUserConfirmModal", () => {
  it("renders delete confirmation with warning message", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser, mockOtherUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("heading", { name: /delete user/i })).toBeDefined();
    expect(
      screen.getByText(/are you sure you want to delete/i),
    ).toBeDefined();
  });

  it("shows reassign dropdown with other users", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser, mockOtherUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const selectLabel = screen.getByLabelText(/reassign posts to/i);
    expect(selectLabel).toBeDefined();
  });

  it("confirms deletion with selected reassign user", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser, mockOtherUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith(2);
    });
  });

  it("cancels deletion when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser, mockOtherUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelBtn);

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("disables buttons when user count is insufficient", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    const cancelBtn = screen.getByRole("button", { name: /cancel/i });

    expect(deleteBtn).toHaveAttribute("disabled");
    expect(cancelBtn).toHaveAttribute("disabled");
  });

  it("shows error when no users available to reassign", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <DeleteUserConfirmModal
        user={mockUser}
        allUsers={[mockUser]}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(
      screen.getByText(/cannot delete: no other users available/i),
    ).toBeDefined();
  });
});
