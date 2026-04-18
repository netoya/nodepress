import type { FC } from "react";
import { Button } from "../../../components/ui";

interface DashboardHeaderProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
}

/**
 * DashboardHeader — Page title + refresh action.
 */
export const DashboardHeader: FC<DashboardHeaderProps> = ({
  onRefresh,
  isRefreshing = false,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "var(--space-6)",
    }}
  >
    <h1
      style={{
        fontSize: "var(--font-size-2xl)",
        fontWeight: "var(--font-weight-bold)",
        color: "var(--color-neutral-800)",
        margin: 0,
      }}
    >
      Dashboard
    </h1>
    <Button
      variant="secondary"
      size="sm"
      loading={isRefreshing}
      onClick={onRefresh}
      aria-label="Refresh posts list"
    >
      Refresh
    </Button>
  </div>
);

DashboardHeader.displayName = "DashboardHeader";
