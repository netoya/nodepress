import type { FC } from "react";
import { useParams } from "react-router-dom";
import { PostEditorPage } from "./PostEditorPage";

/**
 * PostEditorRoute — thin router adapter for PostEditorPage.
 * Reads the optional :id param from the URL and forwards it as postId prop.
 *
 * - /posts/new        → postId = null  (create mode)
 * - /posts/:id/edit   → postId = number (edit mode)
 *
 * Keeping PostEditorPage prop-driven makes it independently testable
 * without a router context (MemoryRouter not required in unit tests).
 */
export const PostEditorRoute: FC = () => {
  const { id } = useParams<{ id?: string }>();
  const postId = id !== undefined ? Number(id) : null;
  return <PostEditorPage postId={postId} />;
};
