import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
  useToast,
} from "../../components/ui";
import { useContentQuery } from "../../hooks/useContentQuery";
import type { WpPage } from "../../types/wp-post";

/**
 * PagesListPage — Pages management page.
 * Columns: Title, Slug, Parent (name of parent page if parent != 0),
 *          Menu Order, Status, Date.
 * States: loading, error, empty, data.
 * AppShell is applied by AdminLayout via the router outlet.
 */
export const PagesListPage: FC = () => {
  // Call the factory inside the component so ESLint rules-of-hooks is satisfied.
  // The factory itself is not a hook — it's a plain function that returns hook-calling
  // functions. Calling it at module level was flagged by the linter because of the
  // "use" prefix. Calling it here (stable per render since endpoint is a constant)
  // produces no overhead.
  const pagesQuery = useContentQuery<WpPage>("/wp/v2/pages");
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = pagesQuery.useListQuery({
    perPage: 100,
  });
  const deleteMutation = pagesQuery.useDeleteMutation();
  const { show } = useToast();

  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleAddNew = () => {
    void navigate("/pages/new");
  };

  const handleEdit = (page: WpPage) => {
    void navigate(`/pages/${page.id}/edit`);
  };

  const handleDelete = (page: WpPage) => {
    setPendingDeleteId(page.id);
  };

  const confirmDelete = (page: WpPage) => {
    setPendingDeleteId(null);
    deleteMutation.mutate(page.id, {
      onSuccess: () => {
        show({ type: "success", message: "Page moved to trash" });
      },
      onError: () => {
        show({ type: "error", message: "Failed to delete page" });
      },
    });
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  // Build a lookup map id → title for the parent column
  const pageMap = new Map<number, string>(
    data?.items.map((p) => [p.id, p.title.rendered]) ?? [],
  );

  return (
    <section
      aria-labelledby="pages-title"
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
          id="pages-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Pages
        </h1>
        <Button variant="primary" size="md" onClick={handleAddNew}>
          New Page
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
          <Spinner size="lg" label="Loading pages" />
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
                  Failed to load pages
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
                aria-label="Retry loading pages"
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.items.length === 0 && (
        <EmptyState
          title="No pages yet"
          description="Create your first page to get started."
          action={
            <Button variant="primary" size="md" onClick={handleAddNew}>
              Create first page
            </Button>
          }
        />
      )}

      {/* Data state — pages table */}
      {!isLoading && !isError && data && data.items.length > 0 && (
        <>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{ width: "100%", borderCollapse: "collapse" }}
              aria-label="Pages"
            >
              <thead>
                <tr>
                  {[
                    "Title",
                    "Slug",
                    "Parent",
                    "Menu Order",
                    "Status",
                    "Date",
                    "Actions",
                  ].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        textAlign: "left",
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-xs, 0.75rem)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-neutral-500)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--letter-spacing-wide)",
                        borderBottom:
                          "1px solid var(--color-neutral-200, #e5e7eb)",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((page) => (
                  <tr
                    key={page.id}
                    onClick={() => handleEdit(page)}
                    style={{ cursor: "pointer" }}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") handleEdit(page);
                    }}
                    aria-label={`Edit page: ${page.title.rendered}`}
                  >
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontWeight: "var(--font-weight-medium)",
                        color: "var(--color-neutral-900)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {page.title.rendered}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-600)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {page.slug}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-600)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {page.parent !== 0
                        ? (pageMap.get(page.parent) ?? `#${page.parent}`)
                        : "—"}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-600)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {page.menu_order}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-sm)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--radius-full, 9999px)",
                          fontSize: "var(--font-size-xs, 0.75rem)",
                          fontWeight: "var(--font-weight-medium)",
                          background:
                            page.status === "publish"
                              ? "var(--color-success-100, #dcfce7)"
                              : "var(--color-neutral-100, #f3f4f6)",
                          color:
                            page.status === "publish"
                              ? "var(--color-success-700, #15803d)"
                              : "var(--color-neutral-600)",
                        }}
                      >
                        {page.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-500)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                    >
                      {new Date(page.date).toLocaleDateString()}
                    </td>
                    <td
                      style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderBottom:
                          "1px solid var(--color-neutral-100, #f3f4f6)",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(page)}
                          aria-label={`Edit page: ${page.title.rendered}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(page)}
                          aria-label={`Delete page: ${page.title.rendered}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline delete confirmation */}
          {pendingDeleteId !== null &&
            (() => {
              const pendingPage = data.items.find(
                (p) => p.id === pendingDeleteId,
              );
              if (!pendingPage) return null;
              return (
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-delete-page-title"
                  aria-describedby="confirm-delete-page-desc"
                  style={{
                    position: "fixed",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.4)",
                    zIndex: 100,
                  }}
                >
                  <div
                    style={{
                      background: "var(--color-neutral-0, #fff)",
                      borderRadius: "var(--radius-md, 8px)",
                      padding: "var(--space-6)",
                      maxWidth: "400px",
                      width: "90%",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-4)",
                    }}
                  >
                    <h2
                      id="confirm-delete-page-title"
                      style={{
                        fontSize: "var(--font-size-base)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--color-neutral-900)",
                        margin: 0,
                      }}
                    >
                      Move to trash?
                    </h2>
                    <p
                      id="confirm-delete-page-desc"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-600)",
                        margin: 0,
                      }}
                    >
                      &ldquo;{pendingPage.title.rendered}&rdquo; will be moved
                      to trash.
                    </p>
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
                        onClick={cancelDelete}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => confirmDelete(pendingPage)}
                      >
                        Move to trash
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })()}
        </>
      )}
    </section>
  );
};

PagesListPage.displayName = "PagesListPage";
