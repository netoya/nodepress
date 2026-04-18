export interface ToastItem {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastProps {
  toast: ToastItem;
  onOpenChange: (open: boolean) => void;
}

const iconMap: Record<string, React.ReactNode> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

const borderColorMap: Record<string, string> = {
  success: "var(--color-success-500)",
  error: "var(--color-danger-500)",
  info: "var(--color-primary-500)",
};

/**
 * Toast — Single toast notification item.
 * Part of the Toast system. Rendered by ToastProvider.
 */
export function Toast({ toast, onOpenChange }: ToastProps) {
  const borderColor = borderColorMap[toast.type] || borderColorMap["info"];
  const icon = iconMap[toast.type] || iconMap["info"];

  const toastStyle: React.CSSProperties = {
    backgroundColor: "var(--color-neutral-0)",
    border: `4px solid ${borderColor}`,
    borderLeft: `4px solid ${borderColor}`,
    borderRadius: "var(--radius-lg)",
    padding: "var(--space-4)",
    boxShadow: "var(--shadow-lg)",
    maxWidth: "360px",
    display: "flex",
    alignItems: "center",
    gap: "var(--space-4)",
  };

  const iconStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: "bold",
    color: borderColor,
    flexShrink: 0,
  };

  const messageStyle: React.CSSProperties = {
    fontSize: "var(--font-size-base)",
    color: "var(--color-neutral-800)",
    fontWeight: "var(--font-weight-regular)",
    flex: 1,
  };

  const closeButtonStyle: React.CSSProperties = {
    background: "none",
    border: "none",
    padding: 0,
    fontSize: "1.5rem",
    color: "var(--color-neutral-500)",
    cursor: "pointer",
    flexShrink: 0,
    outline: "none",
  };

  const role = toast.type === "error" ? "alert" : "status";

  return (
    <div style={toastStyle} role={role}>
      <div style={iconStyle}>{icon}</div>
      <div style={messageStyle}>{toast.message}</div>
      <button
        aria-label="Dismiss notification"
        style={closeButtonStyle}
        onClick={() => onOpenChange(false)}
      >
        ×
      </button>
    </div>
  );
}

Toast.displayName = "Toast";
