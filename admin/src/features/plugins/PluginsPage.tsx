import { useState, useCallback, type FC } from "react";
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Spinner,
  useToast,
} from "../../components/ui";
import { usePluginsQuery } from "./hooks/usePluginsQuery";
import { useUninstallPlugin } from "./hooks/useUninstallPlugin";
import { InstallModal } from "./InstallModal";
import type { WpPlugin } from "../../types/wp-post";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: WpPlugin["status"] }) {
  const styles: Record<
    WpPlugin["status"],
    { background: string; color: string; label: string }
  > = {
    active: {
      background: "var(--color-success-100, #dcfce7)",
      color: "var(--color-success-700, #15803d)",
      label: "Active",
    },
    inactive: {
      background: "var(--color-neutral-100, #f3f4f6)",
      color: "var(--color-neutral-600, #4b5563)",
      label: "Inactive",
    },
    uninstalled: {
      background: "var(--color-danger-100, #fee2e2)",
      color: "var(--color-danger-600, #dc2626)",
      label: "Uninstalled",
    },
  };

  const s = styles[status] ?? styles.inactive;

  return (
    <span
      aria-label={`Status: ${s.label}`}
      style={{
        fontSize: "var(--font-size-xs, 0.75rem)",
        fontWeight: "var(--font-weight-medium)",
        padding: "2px 8px",
        borderRadius: "var(--radius-full, 9999px)",
        background: s.background,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PluginsPage
// ---------------------------------------------------------------------------

/**
 * PluginsPage — Plugin marketplace: browse installed plugins, search, install, uninstall.
 *
 * Sprint 7 features:
 * - Fetches GET /wp/v2/plugins (optionally with ?q= search param)
 * - Install: opens InstallModal → POST /wp/v2/plugins
 * - Uninstall: DELETE /wp/v2/plugins/:slug → backend marks status='uninstalled' (ADR-024)
 * - 4 states: loading, error, empty, data
 *
 * AppShell is applied by AdminLayout via the router outlet.
 */
export const PluginsPage: FC = () => {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInstallModal, setShowInstallModal] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } =
    usePluginsQuery(searchQuery || undefined);
  const { show } = useToast();

  const uninstallMutation = useUninstallPlugin();

  // Debounce-free: user presses Enter or clicks Search to fire query.
  const handleSearch = useCallback(() => {
    setSearchQuery(searchInput.trim());
  }, [searchInput]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  const handleUninstall = (plugin: WpPlugin) => {
    uninstallMutation.mutate(plugin.plugin, {
      onSuccess: () => {
        show({
          type: "success",
          message: `Plugin "${plugin.name}" uninstalled`,
        });
      },
      onError: (err) => {
        show({
          type: "error",
          message: `Failed to uninstall "${plugin.name}": ${err.message}`,
        });
      },
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
          gap: "var(--space-4)",
          flexWrap: "wrap",
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
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowInstallModal(true)}
          aria-label="Install plugin"
        >
          Install plugin
        </Button>
      </div>

      {/* Search bar */}
      <div
        role="search"
        aria-label="Search plugins"
        style={{
          display: "flex",
          gap: "var(--space-2)",
          marginBottom: "var(--space-4)",
        }}
      >
        <input
          id="plugins-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search plugins…"
          aria-label="Search plugins"
          style={{
            flex: 1,
            padding: "var(--space-2) var(--space-3)",
            border: "1px solid var(--color-neutral-300, #d1d5db)",
            borderRadius: "var(--radius-md)",
            fontSize: "var(--font-size-sm)",
            background: "var(--color-neutral-0, #fff)",
            color: "var(--color-neutral-900)",
          }}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSearch}
          aria-label="Submit search"
        >
          Search
        </Button>
        {searchQuery && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleClearSearch}
            aria-label="Clear search"
          >
            Clear
          </Button>
        )}
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
          title={searchQuery ? "No plugins found" : "No plugins installed"}
          description={
            searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : "Install your first plugin using the button above."
          }
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
          {data.map((plugin) => (
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
                          flexWrap: "wrap",
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
                        <StatusBadge status={plugin.status} />
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

                    {/* Uninstall button — hidden for already-uninstalled plugins */}
                    {plugin.status !== "uninstalled" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUninstall(plugin)}
                        disabled={uninstallMutation.isPending}
                        aria-label={`Uninstall plugin ${plugin.name}`}
                      >
                        Uninstall
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Install modal */}
      {showInstallModal && (
        <InstallModal
          onClose={() => setShowInstallModal(false)}
          onSuccess={() => void refetch()}
        />
      )}
    </section>
  );
};

PluginsPage.displayName = "PluginsPage";
