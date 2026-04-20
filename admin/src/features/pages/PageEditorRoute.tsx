import type { FC } from "react";
import { useParams } from "react-router-dom";
import { PageEditorPage } from "./PageEditorPage";

/**
 * PageEditorRoute — thin router adapter for PageEditorPage.
 * Reads the optional :id param from the URL and forwards it as pageId prop.
 *
 * - /pages/new        → pageId = null  (create mode)
 * - /pages/:id/edit   → pageId = number (edit mode)
 *
 * Keeping PageEditorPage prop-driven makes it independently testable
 * without a router context.
 */
export const PageEditorRoute: FC = () => {
  const { id } = useParams<{ id?: string }>();
  const pageId = id !== undefined ? Number(id) : null;
  return <PageEditorPage pageId={pageId} />;
};
