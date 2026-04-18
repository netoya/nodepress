import { useState, type FC } from "react";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
  useToast,
} from "../../components/ui";
import { usePluginsQuery } from "./hooks/usePluginsQuery";
import type { WpPlugin } from "../../types/wp-post";

/**
 * PluginsPage — Installed plugins list with optimistic enable/disable toggle.
 * 4 states: loading, error, empty, data.
 *
 * Sprint 5 constraints:
 * - Enable/Disable is UI-only (optimistic update + toast). Real endpoint in Sprint 6.
 * - No install from URL, no search, no filters.
 *
 * AppShell is applied by AdminLayout via the router outlet.
 */
export const PluginsPage: FC = () => {
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePluginsQuery();
  const { show } = useToast();

  // Optimistic status overrides — keyed by plugin.plugin identifier.
  // Sprint 6: replace with real mutation + invalidation.
  const [statusOverrides, setStatusOverrides] = useState<
    Record<string, "active" | "inactive">
  >({});

  const getStatus = (plugin: WpPlugin): "active" | "inactive" =>
    statusOverrides[plugin.plugin] ?? plugin.status;

  const handleToggle = (plugin: WpPlugin) => {
    const current = getStatus(plugin);
    const next: "active" | "inactive" =
      current === "active" ? "inactive" : "active";

    // Optimistic update
    setStatusOverrides((prev) => ({ ...prev, [plugin.plugin]: next }));

    // Toast feedback
    show({
      type: "success",
      message:
        next === "active"
          ? `Plugin "${plugin.name}" enabled`
          : `Plugin "${plugin.name}" disabled`,
    });
  };

  return (
    <section
      aria-labelledby="plugins-title"
      style={{ maxWidth: "960px", margin: "0 auto" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "var(--space-6)",
        }}
      >
        <h1
          id="plugins-title"
          style={{
            fontSize: "var(--font-size-xl)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          Plugins
        </h1>
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
          <Spinner size="lg" label="Loading plugins" />
        </div>
      )}

      {/* Refetching indicator */}
      {isFetching && !isLoading && (
        <div aria-live="polite" style={{ marginBottom: "var(--space-2)" }}>
          <Spinner size="sm" label="Refreshing plugins" />
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
                  Failed to load plugins
                </h2>
                <p
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-neutral-500)",
                    margin: 0,
                  }}
                >
                  {error.message}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void refetch()}
                aria-label="Retry loading plugins"
              >
                Try again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState
          title="No plugins installed"
          description="Plugins installed via the CLI will appear here."
        />
      )}

      {/* Data state — plugin list */}
      {!isLoading && !isError && data && data.length > 0 && (
        <ul
          aria-label="Installed plugins"
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {data.map((plugin) => {
            const status = getStatus(plugin);
            const isActive = status === "active";

            return (
              <li key={plugin.plugin}>
                <Card>
                  <CardContent>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "var(--space-4)",
                      }}
                    >
                      {/* Plugin info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            marginBottom: "var(--space-1)",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: "var(--font-weight-semibold)",
                              fontSize: "var(--font-size-base)",
                              color: "var(--color-neutral-900)",
                            }}
                          >
                            {plugin.name}
                          </span>
                          <span
                            style={{
                              fontSize: "var(--font-size-xs, 0.75rem)",
                              color: "var(--color-neutral-500)",
                            }}
                          >
                            v{plugin.version}
                          </span>
                          {/* Status badge */}
                          <span
                            aria-label={`Status: ${status}`}
                            style={{
                              fontSize: "var(--font-size-xs, 0.75rem)",
                              fontWeight: "var(--font-weight-medium)",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-full, 9999px)",
                              background: isActive
                                ? "var(--color-success-100, #dcfce7)"
                                : "var(--color-neutral-100, #f3f4f6)",
                              color: isActive
                                ? "var(--color-success-700, #15803d)"
                                : "var(--color-neutral-600, #4b5563)",
                            }}
                          >
                            {isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: "var(--font-size-sm)",
                            color: "var(--color-neutral-600)",
                            margin: "0 0 var(--space-1)",
                          }}
                        >
                          {plugin.description}
                        </p>
                        <p
                          style={{
                            fontSize: "var(--font-size-xs, 0.75rem)",
                            color: "var(--color-neutral-400)",
                            margin: 0,
                          }}
                        >
                          By {plugin.author}
                        </p>
                      </div>

                      {/* Toggle button */}
                      <Button
                        variant={isActive ? "secondary" : "primary"}
                        size="sm"
                        onClick={() => handleToggle(plugin)}
                        aria-label={
                          isActive
                            ? `Disable plugin ${plugin.name}`
                            : `Enable plugin ${plugin.name}`
                        }
                      >
                        {isActive ? "Disable" : "Enable"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

PluginsPage.displayName = "PluginsPage";
