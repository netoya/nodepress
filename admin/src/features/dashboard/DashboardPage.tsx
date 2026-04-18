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
  const { data, isLoading, isError, error, refetch, isFetching } = usePostsList(
    { perPage: 10, status: "publish" },
  );

  const handleCreatePost = () => {
    // TODO: navigate to create post — router added in Sprint 2
    // Intentional no-op until Sprint 2 routing is wired
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
        <PostsList posts={data.posts} />
      )}
    </section>
  );
};

DashboardPage.displayName = "DashboardPage";
