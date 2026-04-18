import { useState, type FC } from "react";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
  useToast,
} from "../../components/ui";
import { usePostsQuery } from "./hooks/usePostsQuery";
import { useDeletePost } from "./hooks/useDeletePost";
import { PostsTable } from "./components/PostsTable";
import type { WpPost } from "../../types/wp-post";

/**
 * PostsListPage — Posts management page.
 * 4 states: loading, error, empty, data.
 * AppShell is applied by App.tsx (same as DashboardPage pattern).
 * No rich text editor — plain textarea in Sprint 1 per Alejandro's constraint.
 *
 * Routing: handled by App.tsx hash-based routing.
 * React Router added in Sprint 2.
 */
export const PostsListPage: FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePostsQuery({ perPage: 20 });
  const deleteMutation = useDeletePost();
  const { show } = useToast();

  // Inline confirmation state — tracks the post id pending deletion.
  // null = no confirmation pending. Replaces window.confirm() for a11y + style.
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const handleAddNew = () => {
    window.location.hash = "posts/new";
  };

  const handleEdit = (post: WpPost) => {
    window.location.hash = `posts/${post.id}/edit`;
  };

  const handleDelete = (post: WpPost) => {
    setPendingDeleteId(post.id);
  };

  const confirmDelete = (post: WpPost) => {
    setPendingDeleteId(null);
    deleteMutation.mutate(post.id, {
      onSuccess: () => {
        show({ type: "success", message: "Post moved to trash" });
      },
      onError: () => {
        show({ type: "error", message: "Failed to delete post" });
      },
    });
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  return (
    <section
      aria-labelledby="posts-title"
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
          id="posts-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Posts
        </h1>
        <Button variant="primary" size="md" onClick={handleAddNew}>
          Add new
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
          <Spinner size="lg" label="Loading posts" />
        </div>
      )}

      {/* Refetching indicator */}
      {isFetching && !isLoading && (
        <div aria-live="polite" style={{ marginBottom: "var(--space-2)" }}>
          <Spinner size="sm" label="Refreshing posts" />
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
                  Failed to load posts
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
                aria-label="Retry loading posts"
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.posts.length === 0 && (
        <EmptyState
          title="No posts yet"
          description="Create your first post to get started."
          action={
            <Button variant="primary" size="md" onClick={handleAddNew}>
              Create first post
            </Button>
          }
        />
      )}

      {/* Data state */}
      {!isLoading && !isError && data && data.posts.length > 0 && (
        <>
          <PostsTable
            posts={data.posts}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Inline delete confirmation — replaces window.confirm() for a11y */}
          {pendingDeleteId !== null &&
            (() => {
              const pendingPost = data.posts.find(
                (p) => p.id === pendingDeleteId,
              );
              if (!pendingPost) return null;
              return (
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="confirm-delete-title"
                  aria-describedby="confirm-delete-desc"
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
                      id="confirm-delete-title"
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
                      id="confirm-delete-desc"
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--color-neutral-600)",
                        margin: 0,
                      }}
                    >
                      &ldquo;{pendingPost.title.rendered}&rdquo; will be moved
                      to trash. You can restore it later from the trash view.
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
                        onClick={() => confirmDelete(pendingPost)}
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

PostsListPage.displayName = "PostsListPage";
