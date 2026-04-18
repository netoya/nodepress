import { AppShell } from "./components/layout/AppShell";

export function App() {
  return (
    <AppShell>
      <h1
        style={{
          fontSize: "var(--font-size-2xl)",
          fontWeight: "var(--font-weight-bold)",
          color: "var(--color-neutral-800)",
          margin: 0,
        }}
      >
        Dashboard
      </h1>
    </AppShell>
  );
}
