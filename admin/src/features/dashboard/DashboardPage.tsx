import type { FC } from "react";
import { usePostsList } from "./hooks/usePostsList";
import { DashboardHeader } from "./components/DashboardHeader";
import { PostsList } from "./components/PostsList";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { DashboardEmpty } from "./components/DashboardEmpty";
import { DashboardError } from "./components/DashboardError";

/**
 * DashboardPage — Root dashboard page.
 * Handles 4 states: loading, error, empty, data.
 *
 * NOTE: Layout will be adjusted once Sofía's wireframes arrive.
 * Current scaffold is functional, not final-design.
 */
export const DashboardPage: FC = () => {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = usePostsList({ perPage: 10, status: "publish" });

  const handleCreatePost = () => {
    // TODO: #GH-frontend-debt — replace with React Router navigation once D-035 migration lands
    // Intentional no-op until React Router v7 migration (Sprint 5)
  };

  return (
    <section
      aria-labelledby="dashboard-title"
      style={{ maxWidth: "800px", margin: "0 auto" }}
    >
      <DashboardHeader
        onRefresh={() => void refetch()}
        isRefreshing={isFetching && !isLoading}
      />

      {isLoading && <DashboardSkeleton />}

      {isError && error && (
        <DashboardError error={error} onRetry={() => void refetch()} />
      )}

      {!isLoading && !isError && data && data.posts.length === 0 && (
        <DashboardEmpty onCreatePost={handleCreatePost} />
      )}

      {!isLoading && !isError && data && data.posts.length > 0 && (
        <>
          <p
            aria-label="Last updated"
            style={{
              fontSize: "var(--font-size-xs, 0.75rem)",
              color: "var(--color-neutral-400)",
              margin: "0 0 var(--space-3)",
              textAlign: "right",
            }}
          >
            Actualizado:{" "}
            {dataUpdatedAt
              ? new Date(dataUpdatedAt).toLocaleTimeString("es-ES")
              : "—"}
          </p>
          <PostsList posts={data.posts} />
        </>
      )}
    </section>
  );
};

DashboardPage.displayName = "DashboardPage";
