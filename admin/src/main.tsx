import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "./App";
import { ToastProvider } from "./components/ui";
import "./styles/tokens.css";
import { startMswWorker } from "./mocks/server";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Start MSW in dev only — no-ops in prod (guarded inside startMswWorker)
startMswWorker().then(() => {
  createRoot(root).render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>,
  );
});
