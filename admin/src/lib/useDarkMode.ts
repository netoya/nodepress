import { useEffect, useState } from "react";

/**
 * useDarkMode — manage dark mode persistence and system preference detection.
 *
 * - Reads `localStorage.theme` on mount. If not set, checks `prefers-color-scheme`.
 * - Applies `data-theme="dark"` attribute to `<html>` element.
 * - Persists user preference to `localStorage.theme`.
 * - Changes to theme trigger re-renders in consuming components.
 *
 * @returns Object with theme state and toggle function
 * @example
 *   const { isDark, toggle } = useDarkMode();
 *   return (
 *     <button onClick={() => toggle()}>
 *       {isDark ? '☀️' : '🌙'}
 *     </button>
 *   );
 */
export function useDarkMode() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Check if user has saved preference
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved === "dark" || saved === "light") {
        return saved === "dark";
      }

      // Fall back to system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches;
      return prefersDark;
    }
    return false;
  });

  // Apply or remove `data-theme="dark"` on HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only apply system preference if no user preference is saved
      const saved = localStorage.getItem("theme");
      if (!saved) {
        setIsDark(e.matches);
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle };
}
