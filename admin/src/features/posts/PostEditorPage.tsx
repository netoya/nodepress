import { useState, type FC } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, Spinner, useToast } from "../../components/ui";
import { PostForm, type PostFormValues } from "./components/PostForm";
import { usePostQuery } from "./hooks/usePostQuery";
import { useCreatePost } from "./hooks/useCreatePost";
import { useUpdatePost } from "./hooks/useUpdatePost";

interface PostEditorPageProps {
  /** null means "new" mode; a number means "edit" mode */
  postId: number | null;
}

const EMPTY_FORM: PostFormValues = {
  title: "",
  slug: "",
  content: "",
  excerpt: "",
  status: "draft",
  categories: [],
  tags: [],
};

/**
 * PostEditorPage — Create or edit a post.
 * - postId === null → new mode: empty form, Create button, POST /wp/v2/posts
 * - postId !== null → edit mode: pre-fills from GET /wp/v2/posts/:id, Update button, PUT /wp/v2/posts/:id
 *
 * No rich text, no blocks — plain textarea per Sprint 1 constraint.
 */
export const PostEditorPage: FC<PostEditorPageProps> = ({ postId }) => {
  const isEditMode = postId !== null;
  const { show } = useToast();
  const navigate = useNavigate();

  // Fetch post data in edit mode
  const { data: post, isLoading: isLoadingPost } = usePostQuery(postId);

  // Derive initial values from server data.
  // Local edits are tracked as overrides on top of server values.
  // Using the post id as the key (via <PostEditorForm key={postId} initialValues={...} />)
  // would be cleaner but requires extracting a child component — fine for Sprint 1 scope.
  // For now: null check on post ensures form only mounts when data is ready (edit mode).
  const serverValues: PostFormValues = post
    ? {
        title: post.title.rendered,
        slug: post.slug,
        content: post.content.rendered,
        excerpt: post.excerpt?.rendered ?? "",
        status: post.status,
        // WP REST API returns categories/tags as arrays of term IDs on the post object.
        // The backend persists taxonomy assignments (POST and PUT both write term_relationships).
        // We default to empty arrays here because the GET /wp/v2/posts/:id response does not
        // yet return the categories/tags arrays — that requires serialize.ts to load and embed
        // term IDs in the WP-REST shape. Until that is done the form always starts empty in
        // edit mode; selections made by the user are sent and persisted correctly on save.
        categories: [],
        tags: [],
      }
    : EMPTY_FORM;

  const [localEdits, setLocalEdits] = useState<Partial<PostFormValues>>({});

  const values: PostFormValues = { ...serverValues, ...localEdits };

  const handleCategoriesChange = (ids: number[]) => {
    setLocalEdits((prev) => ({ ...prev, categories: ids }));
  };

  const handleTagsChange = (ids: number[]) => {
    setLocalEdits((prev) => ({ ...prev, tags: ids }));
  };

  const createMutation = useCreatePost();
  const updateMutation = useUpdatePost(postId ?? 0);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleChange = (field: keyof PostFormValues, value: string) => {
    setLocalEdits((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (isEditMode) {
      updateMutation.mutate(values, {
        onSuccess: () => {
          show({ type: "success", message: "Post updated" });
          void navigate("/posts");
        },
        onError: () => {
          show({ type: "error", message: "Failed to update post" });
        },
      });
    } else {
      createMutation.mutate(values, {
        onSuccess: (created) => {
          show({ type: "success", message: "Post created" });
          void navigate(`/posts/${created.id}/edit`);
        },
        onError: () => {
          show({ type: "error", message: "Failed to create post" });
        },
      });
    }
  };

  const handleCancel = () => {
    void navigate("/posts");
  };

  return (
    <section
      aria-labelledby="editor-title"
      style={{ maxWidth: "800px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          id="editor-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          {isEditMode ? "Edit post" : "New post"}
        </h1>
      </div>

      {/* Loading existing post */}
      {isEditMode && isLoadingPost && (
        <div
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-12, 48px) 0",
          }}
        >
          <Spinner size="lg" label="Loading post" />
        </div>
      )}

      {/* Form — shown in new mode immediately, in edit mode once data arrives */}
      {(!isEditMode || (!isLoadingPost && post)) && (
        <Card>
          <CardContent>
            <PostForm
              values={values}
              onChange={handleChange}
              onCategoriesChange={handleCategoriesChange}
              onTagsChange={handleTagsChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              mode={isEditMode ? "update" : "create"}
              onCancel={handleCancel}
            />
          </CardContent>
        </Card>
      )}
    </section>
  );
};

PostEditorPage.displayName = "PostEditorPage";
