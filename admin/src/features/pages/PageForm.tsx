import { type FC, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input, Textarea, Select, Button } from "../../components/ui";
import type { SelectOption } from "../../components/ui";
import type { WpPage } from "../../types/wp-post";
import { apiUrl } from "../../lib/api";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "publish", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending Review" },
];

export interface PageFormValues {
  title: string;
  slug: string;
  content: string;
  status: string;
  /** Parent page ID. 0 means no parent (top-level). */
  parent: number;
  /** Sort order within siblings. */
  menu_order: number;
}

interface PageFormProps {
  values: PageFormValues;
  onChange: (field: keyof PageFormValues, value: string | number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** "create" shows "Create" button; "update" shows "Update" button */
  mode: "create" | "update";
  onCancel?: () => void;
  /**
   * ID of the page being edited.
   * Used to filter the current page from the parent selector
   * (direct circular reference guard).
   * Pass null in create mode.
   */
  currentPageId: number | null;
}

/**
 * Fetch all pages for the parent selector.
 * Per-page 100 to get the full list in one shot (standard WP pattern).
 */
async function fetchAllPages(): Promise<WpPage[]> {
  const url = new URL(apiUrl("/wp/v2/pages"));
  url.searchParams.set("per_page", "100");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Failed to fetch pages: ${res.status}`);
  return (await res.json()) as WpPage[];
}

/**
 * PageForm — Reusable form for creating and editing pages.
 * Fields: title, slug (auto-generated from title), content, status,
 *         parent (select with all pages), menu_order (number input).
 *
 * Parent selector guard:
 *   - Filters out the current page from the list (prevents direct circular ref).
 *   // TODO: Sprint 8 — prevenir referencias circulares indirectas (A→B→A)
 */
export const PageForm: FC<PageFormProps> = ({
  values,
  onChange,
  onSubmit,
  isSubmitting,
  mode,
  onCancel,
  currentPageId,
}) => {
  const { data: allPages = [] } = useQuery<WpPage[], Error>({
    queryKey: ["pages", "all-for-parent-selector"],
    queryFn: fetchAllPages,
  });

  // Auto-generate slug from title (only when slug is still empty or matches
  // the previous auto-generated value — user can override manually).
  useEffect(() => {
    if (values.title && values.slug === "") {
      const autoSlug = values.title
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      onChange("slug", autoSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.title]);

  // Build parent options:
  //   - "No parent" (value = 0)
  //   - All pages except the current one being edited (direct circular ref guard)
  // TODO: Sprint 8 — prevenir referencias circulares indirectas (A→B→A)
  const parentOptions: SelectOption[] = [
    { value: "0", label: "— No parent —" },
    ...allPages
      .filter((p) => p.id !== currentPageId)
      .map((p) => ({ value: String(p.id), label: p.title.rendered })),
  ];

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
      aria-label={mode === "create" ? "Create page form" : "Edit page form"}
    >
      <Input
        id="page-title"
        label="Title"
        value={values.title}
        onChange={(e) => onChange("title", e.target.value)}
        placeholder="Page title"
        required
        disabled={isSubmitting}
      />

      <Input
        id="page-slug"
        label="Slug"
        value={values.slug}
        onChange={(e) => onChange("slug", e.target.value)}
        placeholder="page-url-slug"
        disabled={isSubmitting}
      />

      <Select
        id="page-status"
        label="Status"
        options={STATUS_OPTIONS}
        value={values.status}
        onChange={(val) => onChange("status", val)}
        disabled={isSubmitting}
      />

      {/* Parent page selector — guard: current page is excluded from the list */}
      <Select
        id="page-parent"
        label="Parent page"
        options={parentOptions}
        value={String(values.parent)}
        onChange={(val) => onChange("parent", Number(val))}
        disabled={isSubmitting}
      />

      {/* Menu order — integer sort key within siblings */}
      <Input
        id="page-menu-order"
        label="Menu Order"
        type="number"
        value={String(values.menu_order)}
        onChange={(e) => onChange("menu_order", Number(e.target.value))}
        disabled={isSubmitting}
      />

      <Textarea
        id="page-content"
        label="Content"
        value={values.content}
        onChange={(e) => onChange("content", e.target.value)}
        autoResize={true}
        rows={12}
        placeholder="Write your page content here..."
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

PageForm.displayName = "PageForm";
