import { Component, type ReactNode } from "react";
import { Button } from "./Button";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — Catches errors in child component tree.
 * Renders custom fallback UI with retry capability.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          role="alert"
          style={{
            padding: "var(--space-8)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-4)",
          }}
        >
          <h2
            style={{
              fontSize: "var(--font-size-lg)",
              color: "var(--color-danger-700)",
              margin: 0,
              fontWeight: "var(--font-weight-semibold)",
            }}
          >
            Algo salió mal
          </h2>
          <p
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--color-neutral-500)",
              margin: 0,
            }}
          >
            {this.state.error?.message || "An unknown error occurred"}
          </p>
          <Button variant="secondary" size="sm" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

// @ts-ignore
ErrorBoundary.displayName = "ErrorBoundary";
