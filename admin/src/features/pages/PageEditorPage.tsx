import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Spinner, useToast } from "../../components/ui";
import { PageForm, type PageFormValues } from "./PageForm";
import { useContentQuery } from "../../hooks/useContentQuery";
import type { WpPage } from "../../types/wp-post";

interface PageEditorPageProps {
  /** null means "new" mode; a number means "edit" mode */
  pageId: number | null;
}

const EMPTY_FORM: PageFormValues = {
  title: "",
  slug: "",
  content: "",
  status: "draft",
  parent: 0,
  menu_order: 0,
};

/**
 * PageEditorPage — Create or edit a page.
 * - pageId === null → new mode: empty form, Create button, POST /wp/v2/pages
 * - pageId !== null → edit mode: pre-fills from GET /wp/v2/pages/:id, Update button, PUT /wp/v2/pages/:id
 *
 * Parent selector guard: current page is excluded from parent options (see PageForm).
 */
export const PageEditorPage: FC<PageEditorPageProps> = ({ pageId }) => {
  // Call the factory inside the component to satisfy ESLint rules-of-hooks.
  const pagesQuery = useContentQuery<WpPage>("/wp/v2/pages");
  const isEditMode = pageId !== null;
  const { show } = useToast();
  const navigate = useNavigate();

  const { data: page, isLoading: isLoadingPage } =
    pagesQuery.useItemQuery(pageId);

  const serverValues: PageFormValues = page
    ? {
        title: page.title.rendered,
        slug: page.slug,
        content: page.content.rendered,
        status: page.status,
        parent: page.parent,
        menu_order: page.menu_order,
      }
    : EMPTY_FORM;

  const [localEdits, setLocalEdits] = useState<Partial<PageFormValues>>({});

  const values: PageFormValues = { ...serverValues, ...localEdits };

  const createMutation = pagesQuery.useCreateMutation<PageFormValues>();
  const updateMutation = pagesQuery.useUpdateMutation<PageFormValues>(
    pageId ?? 0,
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleChange = (
    field: keyof PageFormValues,
    value: string | number,
  ) => {
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (isEditMode) {
      updateMutation.mutate(values, {
        onSuccess: () => {
          show({ type: "success", message: "Page updated" });
          void navigate("/pages");
        },
        onError: () => {
          show({ type: "error", message: "Failed to update page" });
        },
      });
    } else {
      createMutation.mutate(values, {
        onSuccess: (created) => {
          show({ type: "success", message: "Page created" });
          void navigate(`/pages/${created.id}/edit`);
        },
        onError: () => {
          show({ type: "error", message: "Failed to create page" });
        },
      });
    }
  };

  const handleCancel = () => {
    void navigate("/pages");
  };

  return (
    <section
      aria-labelledby="page-editor-title"
      style={{ maxWidth: "800px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          id="page-editor-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          {isEditMode ? "Edit page" : "New page"}
        </h1>
      </div>

      {/* Loading existing page */}
      {isEditMode && isLoadingPage && (
        <div
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-12, 48px) 0",
          }}
        >
          <Spinner size="lg" label="Loading page" />
        </div>
      )}

      {/* Form — shown in new mode immediately, in edit mode once data arrives */}
      {(!isEditMode || (!isLoadingPage && page)) && (
        <Card>
          <CardContent>
            <PageForm
              values={values}
              onChange={handleChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              mode={isEditMode ? "update" : "create"}
              onCancel={handleCancel}
              currentPageId={pageId}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
};

PageEditorPage.displayName = "PageEditorPage";
