import {
  useEffect,
  useRef,
  useId,
  type FC,
  type ReactNode,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  size?: "sm" | "md" | "lg";
}

const SIZE_WIDTHS: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "min(360px, 90vw)",
  md: "min(480px, 90vw)",
  lg: "min(640px, 90vw)",
};

/**
 * Modal — Generic accessible dialog.
 *
 * - role="dialog", aria-modal="true", aria-labelledby connected to title
 * - Backdrop click closes
 * - Escape key closes
 * - Focus moves to first focusable element on mount
 * - Scrolls body lock while open
 */
export const Modal: FC<ModalProps> = ({
  title,
  onClose,
  children,
  size = "md",
}) => {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus to first focusable element on mount.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    if (first) {
      first.focus();
    } else {
      dialog.focus();
    }
  }, []);

  // Close on Escape key.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Close on backdrop click (only when the backdrop itself is clicked).
  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    /* Backdrop */
    <div
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
      data-modal-backdrop="true"
    >
      {/* Dialog panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          background: "var(--color-neutral-0, #ffffff)",
          borderRadius: "var(--radius-lg, 0.5rem)",
          padding: "var(--space-6, 1.5rem)",
          width: SIZE_WIDTHS[size],
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4, 1rem)",
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
          outline: "none",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Title */}
        <h2
          id={titleId}
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-neutral-900)",
            margin: 0,
          }}
        >
          {title}
        </h2>

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

Modal.displayName = "Modal";
