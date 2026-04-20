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
import { UserEditorModal } from "./UserEditorModal";
import { DeleteUserConfirmModal } from "./DeleteUserConfirmModal";
import { apiUrl, authHeaders } from "../../lib/api";
import type { WpUser, WpUserRole } from "../../types/wp-post";

// ---------------------------------------------------------------------------
// Role badge colours
// ---------------------------------------------------------------------------
// (Used by RoleBadge component below)

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

  // Creating state — true means create modal is open.
  const [isCreating, setIsCreating] = useState(false);

  // Deleting state — null means no delete confirm modal open.
  const [deletingUser, setDeletingUser] = useState<WpUser | null>(null);

  // Note: roleOverrides was used in legacy RoleEditorModal for optimistic updates
  // but is not used in the new UserEditorModal. Can be removed in the future.

  const getRole = (user: WpUser): WpUserRole =>
    user.roles[0] ?? "subscriber";

  const handleCreateUser = async (formData: {
    displayName: string;
    email: string;
    password?: string;
    role: WpUserRole;
  }) => {
    const postData: Record<string, unknown> = {
      name: formData.displayName,
      email: formData.email,
      roles: [formData.role],
    };

    if (formData["password"]) {
      postData["password"] = formData["password"];
    }

    const res = await fetch(apiUrl("/wp/v2/users"), {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(postData),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      show({
        type: "error",
        message: `Failed to create user: ${errorMsg}`,
      });
      return;
    }

    setIsCreating(false);
    show({
      type: "success",
      message: `User ${formData.displayName} created successfully`,
    });
    await refetch();
  };

  const handleEditUser = async (
    userId: number,
    formData: {
      displayName: string;
      email: string;
      password?: string | undefined;
      role: WpUserRole;
    },
  ) => {
    const updateData: Record<string, unknown> = {
      name: formData.displayName,
      email: formData.email,
      roles: [formData.role],
    };

    if (formData["password"]) {
      updateData["password"] = formData["password"];
    }

    const res = await fetch(apiUrl(`/wp/v2/users/${userId}`), {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      show({
        type: "error",
        message: `Failed to update user: ${errorMsg}`,
      });
      return;
    }

    setEditingUser(null);
    show({
      type: "success",
      message: `User ${formData.displayName} updated successfully`,
    });
    await refetch();
  };

  const handleDeleteUser = async (userId: number, reassignId: number) => {
    const res = await fetch(
      apiUrl(`/wp/v2/users/${userId}?reassign=${reassignId}`),
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );

    if (!res.ok) {
      const errorMsg = await res.text();
      show({
        type: "error",
        message: `Failed to delete user: ${errorMsg}`,
      });
      return;
    }

    setDeletingUser(null);
    show({
      type: "success",
      message: "User deleted successfully",
    });
    await refetch();
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
        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsCreating(true)}
          aria-label="Create new user"
        >
          New user
        </Button>
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
                          display: "flex",
                          gap: "var(--space-2)",
                          justifyContent: "flex-end",
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                          aria-label={`Edit user ${user.name}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingUser(user)}
                          aria-label={`Delete user ${user.name}`}
                        >
                          Delete
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

      {/* Create user modal */}
      {isCreating && (
        <UserEditorModal
          mode="create"
          onClose={() => setIsCreating(false)}
          onSuccess={handleCreateUser}
        />
      )}

      {/* Edit user modal */}
      {editingUser && (
        <UserEditorModal
          mode="edit"
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(formData) =>
            handleEditUser(editingUser.id, formData)
          }
        />
      )}

      {/* Delete user confirmation modal */}
      {deletingUser && (
        <DeleteUserConfirmModal
          user={deletingUser}
          allUsers={data ?? []}
          onConfirm={(reassignId) =>
            handleDeleteUser(deletingUser.id, reassignId)
          }
          onCancel={() => setDeletingUser(null)}
        />
      )}

      {/* Legacy role editor modal — kept for backward compatibility */}
      {/* This is replaced by UserEditorModal but kept if needed */}
    </section>
  );
};

UsersPage.displayName = "UsersPage";
