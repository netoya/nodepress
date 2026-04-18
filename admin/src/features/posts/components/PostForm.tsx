import type { FC } from "react";
import { Input, Textarea, Select, Button } from "../../../components/ui";
import type { SelectOption } from "../../../components/ui";
import { TaxonomySelector } from "../../../components/TaxonomySelector";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "publish", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
];

export interface PostFormValues {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
  categories: number[];
  tags: number[];
}

interface PostFormProps {
  values: PostFormValues;
  onChange: (field: keyof PostFormValues, value: string) => void;
  /** Called when the user changes the selected category IDs. */
  onCategoriesChange: (ids: number[]) => void;
  /** Called when the user changes the selected tag IDs. */
  onTagsChange: (ids: number[]) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** "create" shows "Create" button; "update" shows "Update" button */
  mode: "create" | "update";
  onCancel?: () => void;
}

/**
 * PostForm — Reusable form for creating and editing posts.
 * Used by PostEditorPage in both new and edit modes.
 * Plain textarea for content — no rich text per Sprint 1 constraint.
 */
export const PostForm: FC<PostFormProps> = ({
  values,
  onChange,
  onCategoriesChange,
  onTagsChange,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
      aria-label={mode === "create" ? "Create post form" : "Edit post form"}
    >
      <Input
        id="post-title"
        label="Title"
        value={values.title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder="Post title"
        required
        disabled={isSubmitting}
      />

      <Input
        id="post-slug"
        label="Slug"
        value={values.slug}
        onChange={(e) => onChange("slug", e.target.value)}
        placeholder="post-url-slug"
        disabled={isSubmitting}
      />

      <Select
        id="post-status"
        label="Status"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={(val) => onChange("status", val)}
        disabled={isSubmitting}
      />

      {/* Taxonomy selectors */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-4)",
        }}
      >
        <TaxonomySelector
          taxonomy="categories"
          selected={values.categories}
          onChange={onCategoriesChange}
          disabled={isSubmitting}
        />
        <TaxonomySelector
          taxonomy="tags"
          selected={values.tags}
          onChange={onTagsChange}
          disabled={isSubmitting}
        />
      </div>

      <Textarea
        id="post-content"
        label="Content"
        value={values.content}
        onChange={(e) => onChange("content", e.target.value)}
        autoResize={true}
        rows={12}
        placeholder="Write your post content here..."
        disabled={isSubmitting}
      />

      <Textarea
        id="post-excerpt"
        label="Excerpt"
        value={values.excerpt}
        onChange={(e) => onChange("excerpt", e.target.value)}
        rows={3}
        placeholder="Short description for listings and SEO"
        disabled={isSubmitting}
      />

      <div
        style={{
          display: "flex",
          gap: "var(--space-3)",
          justifyContent: "flex-end",
        }}
      >
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Updating..."
            : mode === "create"
              ? "Create"
              : "Update"}
        </Button>
      </div>
    </form>
  );
};

PostForm.displayName = "PostForm";
