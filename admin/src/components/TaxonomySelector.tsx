import { type FC } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchTags } from "../lib/api";
import type { WpTerm } from "../types/wp-post";
import { Spinner } from "./ui";

interface TaxonomySelectorProps {
  /** Which taxonomy to show — drives both the query and the label. */
  taxonomy: "categories" | "tags";
  /** Array of currently selected term IDs. */
  selected: number[];
  /** Called with the updated selection when the user toggles a term. */
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

/**
 * TaxonomySelector — renders a checkbox list for categories or tags.
 *
 * Uses React Query to fetch terms from:
 *  - GET /wp/v2/categories (taxonomy="categories")
 *  - GET /wp/v2/tags       (taxonomy="tags")
 *
 * States: loading, empty ("No categories/tags yet"), and the checkbox list.
 *
 * WCAG AA: each checkbox has an associated <label> via htmlFor/id pair.
 * The fieldset + legend provide group semantics without extra ARIA role.
 */
export const TaxonomySelector: FC<TaxonomySelectorProps> = ({
  taxonomy,
  selected,
  onChange,
  disabled = false,
}) => {
  const label = taxonomy === "categories" ? "Categories" : "Tags";

  const { data: terms, isLoading } = useQuery<WpTerm[], Error>({
    queryKey: [taxonomy],
    queryFn: taxonomy === "categories" ? fetchCategories : fetchTags,
    staleTime: 60_000,
  });

  const handleToggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <fieldset
      style={{
        border: "1px solid var(--color-neutral-200)",
        borderRadius: "var(--radius-md, 6px)",
        padding: "var(--space-4)",
        margin: 0,
      }}
      disabled={disabled}
    >
      <legend
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-neutral-700)",
          paddingInline: "var(--space-2)",
        }}
      >
        {label}
      </legend>

      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
          aria-live="polite"
        >
          <Spinner size="sm" label={`Loading ${label.toLowerCase()}`} />
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-neutral-500)",
            }}
          >
            Loading…
          </span>
        </div>
      )}

      {!isLoading && (!terms || terms.length === 0) && (
        <p
          style={{
            margin: 0,
            fontSize: "var(--font-size-sm)",
            color: "var(--color-neutral-500)",
          }}
          data-testid={`taxonomy-empty-${taxonomy}`}
        >
          No {label.toLowerCase()} yet
        </p>
      )}

      {!isLoading && terms && terms.length > 0 && (
        <ul
          aria-label={`${label} list`}
          style={{
            listStyle: "none",
            margin: 0,
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {terms.map((term) => {
            const checkboxId = `taxonomy-${taxonomy}-${term.id}`;
            return (
              <li key={term.id}>
                <label
                  htmlFor={checkboxId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-neutral-800)",
                  }}
                >
                  <input
                    type="checkbox"
                    id={checkboxId}
                    value={term.id}
                    checked={selected.includes(term.id)}
                    onChange={() => handleToggle(term.id)}
                    disabled={disabled}
                  />
                  {term.name}
                  {term.count > 0 && (
                    <span
                      style={{
                        fontSize: "var(--font-size-xs, 0.75rem)",
                        color: "var(--color-neutral-400)",
                      }}
                    >
                      ({term.count})
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
};

TaxonomySelector.displayName = "TaxonomySelector";
