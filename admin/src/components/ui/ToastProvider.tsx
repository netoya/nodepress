import React, { createContext, useContext, useState } from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { Toast, type ToastItem } from "./Toast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RadixToastProvider = RadixToast.Provider as any;

interface ToastContextType {
  show: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const viewportStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "var(--space-6)",
  right: "var(--space-6)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  zIndex: "var(--z-toast)" as unknown as number,
  maxWidth: "360px",
};

/**
 * ToastProvider — Context provider for toast notifications.
 * Manages up to 3 active toasts with auto-dismiss after 5 seconds.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = (toast: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.slice(-2), { ...toast, id }]); // max 3
  };

  const remove = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ show }}>
      <RadixToastProvider duration={5000}>
        {children}
        <div style={viewportStyle}>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              toast={toast}
              onOpenChange={(open) => {
                if (!open) remove(toast.id);
              }}
            />
          ))}
        </div>
      </RadixToastProvider>
    </ToastContext.Provider>
  );
}

ToastProvider.displayName = "ToastProvider";
