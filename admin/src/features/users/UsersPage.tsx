import { useState, type FC } from "react";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
  useToast,
} from "../../components/ui";
import { useUsersQuery } from "./hooks/useUsersQuery";
import { apiUrl, authHeaders } from "../../lib/api";
import type { WpUser, WpUserRole } from "../../types/wp-post";

// ---------------------------------------------------------------------------
// Role badge colours
// ---------------------------------------------------------------------------

const ROLE_STYLES: Record<WpUserRole, { background: string; color: string }> = {
  administrator: {
    background: "var(--color-primary-100, #dbeafe)",
    color: "var(--color-primary-700, #1d4ed8)",
  },
  editor: {
    background: "var(--color-success-100, #dcfce7)",
    color: "var(--color-success-700, #15803d)",
  },
  author: {
    background: "var(--color-warning-100, #fef9c3)",
    color: "var(--color-warning-700, #a16207)",
  },
  subscriber: {
    background: "var(--color-neutral-100, #f3f4f6)",
    color: "var(--color-neutral-600, #4b5563)",
  },
};

function RoleBadge({ role }: { role: WpUserRole }) {
  const styles = ROLE_STYLES[role] ?? ROLE_STYLES.subscriber;
  return (
    <span
      aria-label={`Role: ${role}`}
      style={{
        fontSize: "var(--font-size-xs, 0.75rem)",
        fontWeight: "var(--font-weight-medium)",
        padding: "2px 8px",
        borderRadius: "var(--radius-full, 9999px)",
        background: styles.background,
        color: styles.color,
        textTransform: "capitalize",
        whiteSpace: "nowrap",
      }}
    >
      {role}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Role editor modal
// ---------------------------------------------------------------------------

const ROLES: WpUserRole[] = ["administrator", "editor", "author", "subscriber"];

interface RoleEditorModalProps {
  user: WpUser;
  onSave: (userId: number, role: WpUserRole) => Promise<void>;
  onClose: () => void;
}

const RoleEditorModal: FC<RoleEditorModalProps> = ({
  user,
  onSave,
  onClose,
}) => {
  const [selectedRole, setSelectedRole] = useState<WpUserRole>(
    user.roles[0] ?? "subscriber",
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(user.id, selectedRole);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-editor-title"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--color-neutral-0, #ffffff)",
          borderRadius: "var(--radius-lg, 0.5rem)",
          padding: "var(--space-6, 1.5rem)",
          width: "min(400px, 90vw)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4, 1rem)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          id="role-editor-title"
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Edit role
        </h2>

        {/* User name (readonly) */}
        <div>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-neutral-500)",
              margin: "0 0 var(--space-1)",
            }}
          >
            User
          </p>
          <p
            style={{
              fontSize: "var(--font-size-base)",
              fontWeight: "var(--font-weight-medium)",
              color: "var(--color-neutral-900)",
              margin: 0,
            }}
          >
            {user.name}
          </p>
        </div>

        {/* Role select */}
        <div>
          <label
            htmlFor="role-select"
            style={{
              display: "block",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-neutral-500)",
              marginBottom: "var(--space-1)",
            }}
          >
            Role
          </label>
          <select
            id="role-select"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value as WpUserRole)}
            style={{
              width: "100%",
              padding: "var(--space-2) var(--space-3)",
              border: "1px solid var(--color-neutral-300, #d1d5db)",
              borderRadius: "var(--radius-md)",
              fontSize: "var(--font-size-sm)",
              background: "var(--color-neutral-0, #fff)",
              color: "var(--color-neutral-900)",
            }}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            justifyContent: "flex-end",
          }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isSaving}
            aria-label={`Save role for ${user.name}`}
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// UsersPage
// ---------------------------------------------------------------------------

/**
 * UsersPage — User list with role management.
 * 4 states: loading, error, empty, data.
 *
 * Role editor: optimistic update via PUT /wp/v2/users/:id.
 * AppShell is applied by AdminLayout via the router outlet.
 */
export const UsersPage: FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useUsersQuery();
  const { show } = useToast();

  // Editing state — null means no modal open.
  const [editingUser, setEditingUser] = useState<WpUser | null>(null);

  // Optimistic role overrides — keyed by user id.
  const [roleOverrides, setRoleOverrides] = useState<
    Record<number, WpUserRole>
  >({});

  const getRole = (user: WpUser): WpUserRole =>
    roleOverrides[user.id] ?? user.roles[0] ?? "subscriber";

  const handleSaveRole = async (userId: number, role: WpUserRole) => {
    // Optimistic update before network call.
    setRoleOverrides((prev) => ({ ...prev, [userId]: role }));

    const res = await fetch(apiUrl(`/wp/v2/users/${userId}`), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify({ roles: [role] }),
    });

    if (!res.ok) {
      // Rollback optimistic update on failure.
      setRoleOverrides((prev) => {
        const copy = { ...prev };
        delete copy[userId];
        return copy;
      });
      show({ type: "error", message: "Failed to update role" });
      return;
    }

    const name = data?.find((u) => u.id === userId)?.name ?? "User";
    show({
      type: "success",
      message: `Role updated for ${name} → ${role}`,
    });
  };

  return (
    <section
      aria-labelledby="users-title"
      style={{ maxWidth: "960px", margin: "0 auto" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
        }}
      >
        <h1
          id="users-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Users
        </h1>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-12, 48px) 0",
          }}
        >
          <Spinner size="lg" label="Loading users" />
        </div>
      )}

      {/* Refetching indicator */}
      {isFetching && !isLoading && (
        <div aria-live="polite" style={{ marginBottom: "var(--space-2)" }}>
          <Spinner size="sm" label="Refreshing users" />
        </div>
      )}

      {/* Error state */}
      {isError && error && (
        <Card role="alert" aria-live="assertive">
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-danger-600, #dc2626)",
                    margin: "0 0 var(--space-1)",
                  }}
                >
                  Failed to load users
                </h2>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-neutral-500)",
                    margin: 0,
                  }}
                >
                  {error.message}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refetch()}
                aria-label="Retry loading users"
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          title="No users found"
          description="Users registered in NodePress will appear here."
        />
      )}

      {/* Data state — users table */}
      {!isLoading && !isError && data && data.length > 0 && (
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table
              aria-label="Users"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "var(--font-size-sm)",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-neutral-200, #e5e7eb)",
                    background: "var(--color-neutral-50, #f9fafb)",
                  }}
                >
                  {["Avatar", "Name / Email", "Role", "Registered", ""].map(
                    (col) => (
                      <th
                        key={col}
                        scope="col"
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          fontWeight: "var(--font-weight-medium)",
                          color: "var(--color-neutral-600)",
                          textAlign: "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {col}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((user) => {
                  const role = getRole(user);
                  const initial = user.name.charAt(0).toUpperCase();
                  const registered = new Date(
                    user.registered_date,
                  ).toLocaleDateString("en-GB", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {/* Avatar */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <div
                          aria-hidden="true"
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "var(--radius-full, 9999px)",
                            background: "var(--color-primary-100, #dbeafe)",
                            color: "var(--color-primary-700, #1d4ed8)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "var(--font-weight-semibold)",
                            fontSize: "var(--font-size-sm)",
                          }}
                        >
                          {initial}
                        </div>
                      </td>

                      {/* Name + Email */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <p
                          style={{
                            margin: "0 0 2px",
                            fontWeight: "var(--font-weight-medium)",
                            color: "var(--color-neutral-900)",
                          }}
                        >
                          {user.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            color: "var(--color-neutral-500)",
                            fontSize: "var(--font-size-xs, 0.75rem)",
                          }}
                        >
                          {user.email}
                        </p>
                      </td>

                      {/* Role badge */}
                      <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                        <RoleBadge role={role} />
                      </td>

                      {/* Registered date */}
                      <td
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          color: "var(--color-neutral-600)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <time dateTime={user.registered_date}>
                          {registered}
                        </time>
                      </td>

                      {/* Actions */}
                      <td
                        style={{
                          padding: "var(--space-3) var(--space-4)",
                          textAlign: "right",
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          aria-label={`Edit role for ${user.name}`}
                        >
                          Edit role
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Role editor modal */}
      {editingUser && (
        <RoleEditorModal
          user={{ ...editingUser, roles: [getRole(editingUser)] }}
          onSave={handleSaveRole}
          onClose={() => setEditingUser(null)}
        />
      )}
    </section>
  );
};

UsersPage.displayName = "UsersPage";
