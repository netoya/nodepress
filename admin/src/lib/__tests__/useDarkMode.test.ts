import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "../useDarkMode";

describe("useDarkMode", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset document attribute
    document.documentElement.removeAttribute("data-theme");
    // Mock matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)" ? false : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("should initialize with light mode by default when no preference is saved", () => {
    const { result } = renderHook(() => useDarkMode());
    expect(result.current.isDark).toBe(false);
  });

  it("should apply data-theme='dark' attribute when dark mode is enabled", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(result.current.isDark).toBe(true);
  });

  it("should remove data-theme attribute when dark mode is disabled", () => {
    // First enable dark mode
    const { result } = renderHook(() => useDarkMode());
    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // Then disable it
    act(() => {
      result.current.toggle();
    });

    expect(document.documentElement.getAttribute("data-theme")).toBeNull();
    expect(result.current.isDark).toBe(false);
  });

  it("should persist theme preference to localStorage", () => {
    const { result } = renderHook(() => useDarkMode());

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem("theme")).toBe("dark");

    act(() => {
      result.current.toggle();
    });

    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("should restore theme from localStorage on init", () => {
    localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useDarkMode());

    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("should respect system preference when no localStorage preference exists", () => {
    // Mock system preference for dark mode
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(prefers-color-scheme: dark)" ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const { result } = renderHook(() => useDarkMode());

    expect(result.current.isDark).toBe(true);
  });

  it("should toggle between dark and light modes", () => {
    const { result } = renderHook(() => useDarkMode());

    expect(result.current.isDark).toBe(false);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isDark).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isDark).toBe(false);
  });
});
