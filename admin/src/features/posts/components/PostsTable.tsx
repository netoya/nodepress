import type { FC } from "react";
import type { WpPost } from "../../../types/wp-post";
import { Button } from "../../../components/ui";

interface PostsTableProps {
  posts: WpPost[];
  onEdit?: (post: WpPost) => void;
  onDelete?: (post: WpPost) => void;
}

/**
 * PostsTable — Accessible table showing posts with Title, Status, Date, Actions.
 * Uses semantic <table> with <th scope> for WCAG AA compliance.
 */
export const PostsTable: FC<PostsTableProps> = ({
  posts,
  onEdit,
  onDelete,
}) => {
  return (
    <div style={{ overflowX: "auto" }}>
      <table
        aria-label="Posts list"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "var(--font-size-sm)",
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "2px solid var(--color-neutral-200)",
              textAlign: "left",
            }}
          >
            <th
              scope="col"
              style={{
                padding: "var(--space-3) var(--space-4)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-neutral-700)",
              }}
            >
              Title
            </th>
            <th
              scope="col"
              style={{
                padding: "var(--space-3) var(--space-4)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-neutral-700)",
              }}
            >
              Status
            </th>
            <th
              scope="col"
              style={{
                padding: "var(--space-3) var(--space-4)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-neutral-700)",
              }}
            >
              Date
            </th>
            <th
              scope="col"
              style={{
                padding: "var(--space-3) var(--space-4)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--color-neutral-700)",
              }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr
              key={post.id}
              style={{ borderBottom: "1px solid var(--color-neutral-100)" }}
            >
              <td
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  color: "var(--color-neutral-800)",
                  fontWeight: "var(--font-weight-medium)",
                }}
              >
                {post.title.rendered}
              </td>
              <td style={{ padding: "var(--space-3) var(--space-4)" }}>
                <span
                  data-status={post.status}
                  style={{
                    display: "inline-block",
                    padding: "2px var(--space-2)",
                    borderRadius: "var(--radius-full)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: "var(--font-weight-semibold)",
                    background:
                      post.status === "publish"
                        ? "var(--color-success-100, #d1fae5)"
                        : post.status === "draft"
                          ? "var(--color-neutral-100)"
                          : "var(--color-warning-100, #fef3c7)",
                    color:
                      post.status === "publish"
                        ? "var(--color-success-700, #065f46)"
                        : post.status === "draft"
                          ? "var(--color-neutral-600)"
                          : "var(--color-warning-700, #92400e)",
                  }}
                >
                  {post.status}
                </span>
              </td>
              <td
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  color: "var(--color-neutral-500)",
                }}
              >
                {new Date(post.date).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </td>
              <td
                style={{
                  padding: "var(--space-3) var(--space-4)",
                  display: "flex",
                  gap: "var(--space-2)",
                }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit?.(post)}
                  aria-label={`Edit post: ${post.title.rendered}`}
                >
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete?.(post)}
                  aria-label={`Delete post: ${post.title.rendered}`}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

PostsTable.displayName = "PostsTable";
