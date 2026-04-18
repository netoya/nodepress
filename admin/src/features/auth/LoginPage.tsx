import { type FC, type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { setToken, setApiBase } from "../../lib/api";

/**
 * LoginPage — Connect to a NodePress backend.
 * Stores token + API base URL in localStorage.
 * In MSW mode any non-empty token works.
 */
export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const [apiUrl, setApiUrl] = useState(
    (import.meta.env["VITE_API_URL"] as string | undefined) ??
      "http://localhost:3000",
  );
  const [token, setTokenValue] = useState(
    (import.meta.env["VITE_ADMIN_TOKEN"] as string | undefined) ?? "",
  );
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token.trim()) {
      setError("Admin token is required.");
      return;
    }
    setApiBase(apiUrl.trim());
    setToken(token.trim());
    void navigate("/");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-neutral-50, #f9fafb)",
        fontFamily: "var(--font-family-ui)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "var(--space-8)",
          background: "var(--color-neutral-0, #fff)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--color-neutral-200)",
        }}
      >
        {/* Brand */}
        <div style={{ marginBottom: "var(--space-8)", textAlign: "center" }}>
          <span
            style={{
              fontSize: "var(--font-size-xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-primary-500)",
              letterSpacing: "var(--letter-spacing-tight)",
            }}
          >
            NodePress
          </span>
          <p
            style={{
              marginTop: "var(--space-2)",
              fontSize: "var(--font-size-sm)",
              color: "var(--color-neutral-500)",
            }}
          >
            Connect to your admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            <Input
              id="login-api-url"
              label="API URL"
              type="url"
              placeholder="http://localhost:3000"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              autoComplete="url"
            />

            <Input
              id="login-token"
              label="Admin Token"
              type="password"
              placeholder="dev-admin-token"
              value={token}
              onChange={(e) => setTokenValue(e.target.value)}
              error={error}
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              style={{ width: "100%", marginTop: "var(--space-2)" }}
            >
              Connect
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

LoginPage.displayName = "LoginPage";
