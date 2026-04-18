import type { FC } from "react";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
} from "../../components/ui";
import { usePostsQuery } from "./hooks/usePostsQuery";
import { PostsTable } from "./components/PostsTable";

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

  const handleAddNew = () => {
    // TODO: navigate to create post — router added in Sprint 2
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
        <PostsTable posts={data.posts} />
      )}
    </section>
  );
};

PostsListPage.displayName = "PostsListPage";
