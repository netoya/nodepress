import { useState, type FC, type FormEvent } from "react";
import { Modal, Button, Input, Select, useToast } from "../../components/ui";
import type { WpUser, WpUserRole } from "../../types/wp-post";

interface UserEditorModalProps {
  mode: "create" | "edit";
  user?: WpUser;
  onClose: () => void;
  onSuccess: (data: {
    displayName: string;
    email: string;
    password?: string;
    role: WpUserRole;
  }) => Promise<void>;
}

const ROLES: WpUserRole[] = ["administrator", "editor", "author", "subscriber"];

/**
 * UserEditorModal — Create or edit a user.
 *
 * Create mode:
 * - Fields: displayName (required), email (required), password (required), role (required)
 *
 * Edit mode:
 * - Fields: displayName (required), email (required), password (optional), role (required)
 * - Password field shows placeholder "Leave empty to keep current password"
 */
export const UserEditorModal: FC<UserEditorModalProps> = ({
  mode,
  user,
  onClose,
  onSuccess,
}) => {
  const { show } = useToast();

  const [displayName, setDisplayName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<WpUserRole>(user?.roles[0] ?? "subscriber");
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string | undefined> = {};

    if (!displayName.trim()) {
      newErrors["displayName"] = "Display name is required";
    }

    if (!email.trim()) {
      newErrors["email"] = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors["email"] = "Invalid email address";
    }

    if (mode === "create" && !password) {
      newErrors["password"] = "Password is required for new users";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors as Record<string, string>);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSuccess({
        displayName,
        email,
        ...(password ? { password } : {}),
        role,
      });
    } catch (err) {
      show({
        type: "error",
        message: err instanceof Error ? err.message : "Operation failed",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={mode === "create" ? "Create new user" : "Edit user"}
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {/* Display Name */}
          <div>
            <Input
              label="Display Name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              error={errors["displayName"] || undefined}
              required
              disabled={isSaving}
            />
          </div>

          {/* Email */}
          <div>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors["email"] || undefined}
              required
              disabled={isSaving}
            />
          </div>

          {/* Password */}
          <div>
            <Input
              label={mode === "create" ? "Password" : "Password (optional)"}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors["password"] || undefined}
              required={mode === "create"}
              placeholder={
                mode === "edit"
                  ? "Leave empty to keep current password"
                  : undefined
              }
              disabled={isSaving}
            />
          </div>

          {/* Role */}
          <div>
            <Select
              label="Role"
              value={role}
              onChange={(val) => setRole(val as WpUserRole)}
              options={ROLES.map((r) => ({
                value: r,
                label: r.charAt(0).toUpperCase() + r.slice(1),
              }))}
              disabled={isSaving}
            />
          </div>

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
              onClick={onClose}
              disabled={isSaving}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

UserEditorModal.displayName = "UserEditorModal";
