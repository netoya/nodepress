import { useState, type FC } from "react";
import { Modal, Button, Select } from "../../components/ui";
import type { WpUser } from "../../types/wp-post";

interface DeleteUserConfirmModalProps {
  user: WpUser;
  allUsers: WpUser[];
  onConfirm: (reassignId: number) => Promise<void>;
  onCancel: () => void;
}

/**
 * DeleteUserConfirmModal — Confirm user deletion and reassign posts.
 *
 * Shows a dropdown to select a user to reassign posts to (excluding the user being deleted).
 * On confirm, calls onConfirm with the reassign user ID.
 */
export const DeleteUserConfirmModal: FC<DeleteUserConfirmModalProps> = ({
  user,
  allUsers,
  onConfirm,
  onCancel,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter out the user being deleted for reassignment options
  const availableUsers = allUsers.filter((u) => u.id !== user.id);

  const [selectedReassignId, setSelectedReassignId] = useState<number>(
    availableUsers[0]?.id ?? 0,
  );

  const handleConfirm = async () => {
    if (selectedReassignId === 0) {
      return;
    }

    setIsDeleting(true);
    try {
      await onConfirm(selectedReassignId);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal title="Delete user" onClose={onCancel} size="sm">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {/* Warning message */}
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-neutral-700)",
          }}
        >
          Are you sure you want to delete <strong>{user.name}</strong>? This
          action cannot be undone. You can reassign their posts to another user.
        </p>

        {/* Reassign dropdown */}
        {availableUsers.length > 0 && (
          <div>
            <Select
              label="Reassign posts to"
              value={String(selectedReassignId)}
              onChange={(val) => setSelectedReassignId(Number(val))}
              options={availableUsers.map((u) => ({
                value: String(u.id),
                label: u.name,
              }))}
              disabled={isDeleting}
            />
          </div>
        )}

        {/* Error state if no users available */}
        {availableUsers.length === 0 && (
          <p
            style={{
              margin: 0,
              fontSize: "var(--font-size-sm)",
              color: "var(--color-danger-600, #dc2626)",
            }}
          >
            Cannot delete: no other users available to reassign posts.
          </p>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
            marginTop: "var(--space-4)",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={isDeleting || availableUsers.length === 0}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={isDeleting || availableUsers.length === 0}
            onClick={handleConfirm}
            type="button"
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

DeleteUserConfirmModal.displayName = "DeleteUserConfirmModal";
