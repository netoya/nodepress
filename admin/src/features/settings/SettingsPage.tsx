import { useEffect, useState, type FC, type FormEvent } from "react";
import {
  Button,
  Card,
  CardContent,
  Spinner,
  useToast,
  Input,
  Select,
} from "../../components/ui";
import { useSettings } from "./hooks/useSettings";
import { useSaveSettings } from "./hooks/useSaveSettings";
import { useCategories } from "../posts/hooks/useCategories";
import type { WpSettings } from "./hooks/useSettings";
import type { WpTerm } from "../../types/wp-post";

/**
 * SettingsPage — Site settings form.
 * 6 fields: title, description, url, email, posts_per_page, default_category.
 * Loads from GET /wp/v2/settings, saves via PUT /wp/v2/settings.
 */
export const SettingsPage: FC = () => {
  const { show } = useToast();

  // Queries
  const { data: settings, isLoading, isError, error } = useSettings();
  const { data: categories } = useCategories();
  const { mutate: saveSettings, isPending: isSaving } = useSaveSettings();

  // Form state
  const [formData, setFormData] = useState<WpSettings>({
    title: "",
    description: "",
    url: "",
    email: "",
    posts_per_page: 10,
    default_category: 1,
  });

  // Sync settings to form when loaded
  useEffect(() => {
    if (settings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        title: settings.title ?? "",
        description: settings.description ?? "",
        url: settings.url ?? "",
        email: settings.email ?? "",
        posts_per_page: settings.posts_per_page ?? 10,
        default_category: settings.default_category ?? 1,
      });
    }
  }, [settings]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      show({ type: "error", message: "Site Title is required" });
      return;
    }

    if (!formData.url.trim()) {
      show({ type: "error", message: "Site URL is required" });
      return;
    }

    if (!formData.email.trim()) {
      show({ type: "error", message: "Admin Email is required" });
      return;
    }

    if (formData.posts_per_page < 1 || formData.posts_per_page > 100) {
      show({
        type: "error",
        message: "Posts Per Page must be between 1 and 100",
      });
      return;
    }

    saveSettings(formData, {
      onSuccess: () => {
        show({
          type: "success",
          message: "Settings saved successfully",
        });
      },
      onError: (err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to save settings";
        show({ type: "error", message });
      },
    });
  };

  return (
    <section
      aria-labelledby="settings-title"
      style={{ maxWidth: "720px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ marginBottom: "var(--space-6)" }}>
        <h1
          id="settings-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Settings
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-neutral-500)",
            margin: "var(--space-2) 0 0",
          }}
        >
          Configure your site's general settings
        </p>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div
          aria-live="polite"
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-12, 48px) 0",
          }}
        >
          <Spinner size="lg" label="Loading settings" />
        </div>
      )}

      {/* Error state */}
      {isError && error && (
        <Card role="alert" aria-live="assertive">
          <CardContent>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-4)",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "var(--font-size-base)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--color-danger-600, #dc2626)",
                    margin: "0 0 var(--space-1)",
                  }}
                >
                  Failed to load settings
                </h2>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-neutral-500)",
                    margin: 0,
                  }}
                >
                  {error instanceof Error ? error.message : "Unknown error"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings form */}
      {!isLoading && !isError && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-6)",
                }}
              >
                {/* Site Title */}
                <div>
                  <Input
                    label="Site Title"
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    required
                    disabled={isSaving}
                  />
                </div>

                {/* Tagline / Description */}
                <div>
                  <label
                    htmlFor="description"
                    style={{
                      display: "block",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-neutral-700)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    Tagline
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={isSaving}
                    style={{
                      width: "100%",
                      padding: "var(--space-2) var(--space-3)",
                      border: "1px solid var(--color-neutral-300, #c9c6dc)",
                      borderRadius: "var(--radius-md)",
                      fontSize: "var(--font-size-sm)",
                      fontFamily: "var(--font-family-ui)",
                      background: "var(--color-neutral-0, #fff)",
                      color: "var(--color-neutral-900)",
                      minHeight: "80px",
                      resize: "vertical",
                    }}
                  />
                </div>

                {/* Site URL */}
                <div>
                  <Input
                    label="Site URL"
                    type="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        url: e.target.value,
                      }))
                    }
                    required
                    disabled={isSaving}
                  />
                </div>

                {/* Admin Email */}
                <div>
                  <Input
                    label="Admin Email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    required
                    disabled={isSaving}
                  />
                </div>

                {/* Posts Per Page */}
                <div>
                  <Input
                    label="Posts Per Page"
                    type="number"
                    value={formData.posts_per_page}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        posts_per_page: Number(e.target.value),
                      }))
                    }
                    min={1}
                    max={100}
                    disabled={isSaving}
                  />
                </div>

                {/* Default Category */}
                <div>
                  <Select
                    label="Default Category"
                    value={String(formData.default_category)}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        default_category: Number(val),
                      }))
                    }
                    options={
                      categories?.map((cat: WpTerm) => ({
                        value: String(cat.id),
                        label: cat.name,
                      })) ?? []
                    }
                    disabled={isSaving || !categories}
                  />
                </div>

                {/* Save Button */}
                <div
                  style={{
                    display: "flex",
                    gap: "var(--space-3)",
                    justifyContent: "flex-end",
                    marginTop: "var(--space-6)",
                  }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving…" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

SettingsPage.displayName = "SettingsPage";
