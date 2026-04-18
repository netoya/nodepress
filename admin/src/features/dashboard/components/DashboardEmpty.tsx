import type { FC } from "react";
import { EmptyState, Button } from "../../../components/ui";

interface DashboardEmptyProps {
  onCreatePost: () => void;
}

/**
 * DashboardEmpty — Empty state when there are no published posts.
 */
export const DashboardEmpty: FC<DashboardEmptyProps> = ({ onCreatePost }) => (
  <EmptyState
    icon={
      <svg
        aria-hidden="true"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    }
    title="No posts yet"
    description="Create your first post to get started with NodePress."
    action={
      <Button variant="primary" size="md" onClick={onCreatePost}>
        Create first post
      </Button>
    }
  />
);

DashboardEmpty.displayName = "DashboardEmpty";
