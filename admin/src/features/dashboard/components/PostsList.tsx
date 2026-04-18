import type { FC } from "react";
import { Card, CardContent } from "../../../components/ui";
import type { WpPost } from "../../../types/wp-post";

interface PostsListProps {
  posts: WpPost[];
}

/**
 * PostsList — Renders a list of WP posts as cards.
 * Reusable: accepts posts as props, no data-fetching inside.
 */
export const PostsList: FC<PostsListProps> = ({ posts }) => (
  <ul
    role="list"
    aria-label="Posts"
    style={{
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      listStyle: "none",
      padding: 0,
      margin: 0,
    }}
  >
    {posts.map((post) => (
      <li key={post.id}>
        <Card>
          <CardContent>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "var(--space-4)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1 }}>
                <h2
                  style={{
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-neutral-800)",
                    margin: "0 0 var(--space-1)",
                  }}
                >
                  {post.title.rendered}
                </h2>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-neutral-500)",
                    margin: 0,
                    lineHeight: "var(--line-height-relaxed)",
                  }}
                >
                  {post.slug}
                </p>
              </div>
              <span
                style={{
                  fontSize: "var(--font-size-xs, 0.75rem)",
                  color: "var(--color-neutral-400)",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(post.date).toLocaleDateString("en-GB")}
              </span>
            </div>
          </CardContent>
        </Card>
      </li>
    ))}
  </ul>
);

PostsList.displayName = "PostsList";
