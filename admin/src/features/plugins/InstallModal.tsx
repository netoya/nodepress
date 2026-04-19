import { useState, type FC, type FormEvent } from "react";
import { Button } from "../../components/ui";
import { useInstallPlugin } from "./hooks/useInstallPlugin";

interface InstallModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * InstallModal — Modal for installing a plugin via slug or tarball URL.
 *
 * Submits POST /wp/v2/plugins with { slug, registryUrl? }.
 * On success: closes the modal and notifies parent (PluginsPage) to refetch.
 */
export const InstallModal: FC<InstallModalProps> = ({ onClose, onSuccess }) => {
  const [slug, setSlug] = useState("");
  const [registryUrl, setRegistryUrl] = useState("");

  const { mutate: install, isPending, error, reset } = useInstallPlugin();

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedSlug = slug.trim();
    if (!trimmedSlug) return;

    const payload = {
      slug: trimmedSlug,
      ...(registryUrl.trim() ? { registryUrl: registryUrl.trim() } : {}),
    };

    install(payload, {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
    });
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isPending) onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-modal-title"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.45)",
        zIndex: 1000,
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: "var(--color-neutral-0, #ffffff)",
          borderRadius: "var(--radius-lg, 0.5rem)",
          padding: "var(--space-6, 1.5rem)",
          width: "min(480px, 90vw)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4, 1rem)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
        }}
      >
        <h2
          id="install-modal-title"
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Install plugin
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          {/* Slug field */}
          <div>
            <label
              htmlFor="plugin-slug"
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-neutral-600)",
                marginBottom: "var(--space-1)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Plugin slug <span aria-hidden="true">*</span>
            </label>
            <input
              id="plugin-slug"
              type="text"
              required
              value={slug}
              onChange={(e) => {
                reset();
                setSlug(e.target.value);
              }}
              placeholder="e.g. nodepress-seo"
              disabled={isPending}
              aria-describedby={error ? "install-error" : undefined}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-neutral-300, #d1d5db)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                background: "var(--color-neutral-0, #fff)",
                color: "var(--color-neutral-900)",
              }}
            />
          </div>

          {/* Registry URL field (optional) */}
          <div>
            <label
              htmlFor="registry-url"
              style={{
                display: "block",
                fontSize: "var(--font-size-sm)",
                color: "var(--color-neutral-600)",
                marginBottom: "var(--space-1)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Registry URL{" "}
              <span
                style={{
                  fontSize: "var(--font-size-xs, 0.75rem)",
                  color: "var(--color-neutral-400)",
                  fontWeight: "var(--font-weight-normal)",
                }}
              >
                (optional — tarball URL or custom registry)
              </span>
            </label>
            <input
              id="registry-url"
              type="url"
              value={registryUrl}
              onChange={(e) => {
                reset();
                setRegistryUrl(e.target.value);
              }}
              placeholder="https://registry.example.com/plugin.tar.gz"
              disabled={isPending}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "var(--space-2) var(--space-3)",
                border: "1px solid var(--color-neutral-300, #d1d5db)",
                borderRadius: "var(--radius-md)",
                fontSize: "var(--font-size-sm)",
                background: "var(--color-neutral-0, #fff)",
                color: "var(--color-neutral-900)",
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              id="install-error"
              role="alert"
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--color-danger-600, #dc2626)",
                margin: 0,
              }}
            >
              {error.message}
            </p>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "var(--space-3)",
              justifyContent: "flex-end",
              paddingTop: "var(--space-2)",
            }}
          >
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isPending || !slug.trim()}
              aria-label="Confirm install"
            >
              {isPending ? "Installing…" : "Install"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

InstallModal.displayName = "InstallModal";
