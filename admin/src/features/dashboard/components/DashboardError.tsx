import type { FC } from "react";
import { Card, CardContent, Button } from "../../../components/ui";

interface DashboardErrorProps {
  error: Error;
  onRetry: () => void;
}

/**
 * DashboardError — Error state with retry action.
 * Accessible: retry button has clear label and focus management.
 */
export const DashboardError: FC<DashboardErrorProps> = ({ error, onRetry }) => (
  <Card role="alert" aria-live="assertive">
    <CardContent>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
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
          onClick={onRetry}
          aria-label="Retry loading posts"
        >
          Try again
        </Button>
      </div>
    </CardContent>
  </Card>
);

DashboardError.displayName = "DashboardError";
