import type { FC } from "react";
import { Spinner } from "../../../components/ui";

/**
 * DashboardSkeleton — Loading state.
 * Shows a Spinner + placeholder cards while data is fetching.
 */
export const DashboardSkeleton: FC = () => (
  <div role="status" aria-label="Loading posts" aria-live="polite">
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        marginBottom: "var(--space-6)",
      }}
    >
      {/* aria-hidden hides the Spinner's inner role="status" — the container div already owns the live region */}
      <span aria-hidden="true">
        <Spinner size="md" label="" />
      </span>
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          color: "var(--color-neutral-500)",
        }}
      >
        Loading posts…
      </span>
    </div>
    <ul
      aria-hidden="true"
      role="list"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {[1, 2, 3].map((i) => (
        <li
          key={i}
          style={{
            height: "72px",
            borderRadius: "var(--radius-xl)",
            backgroundColor: "var(--color-neutral-100)",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </ul>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
  </div>
);

DashboardSkeleton.displayName = "DashboardSkeleton";
