import { create } from "zustand";
import type { ThemePreference } from "@/types";

export type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}

interface ThemeState {
  theme: Theme;
  /** Aplica el tema localmente (DOM + localStorage) sin tocar el backend. */
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const initialTheme = getInitialTheme();
applyTheme(initialTheme);

export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));

export function themeToPreference(theme: Theme): ThemePreference {
  return theme === "dark" ? "DARK" : "LIGHT";
}

export function preferenceToTheme(preference: ThemePreference): Theme {
  return preference === "DARK" ? "dark" : "light";
}
