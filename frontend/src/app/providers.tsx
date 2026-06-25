"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { RoleProvider } from "@/lib/context/RoleContext";

interface ThemeContextValue {
  theme: string;
  setTheme: (t: string) => void;
  resolvedTheme: string;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
  resolvedTheme: "dark",
});

export function useTheme() {
  return useContext(ThemeContext);
}

function disableTransitions() {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}")
  );
  document.head.appendChild(style);
  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => document.head.removeChild(style), 1);
  };
}

export function Providers({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<string>("dark");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
  }, [theme]);

  const setTheme = useCallback((next: string) => {
    const restore = disableTransitions();
    setThemeState(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    document.documentElement.classList.toggle("dark", next === "dark");
    document.documentElement.classList.toggle("light", next !== "dark");
    restore();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: theme }}>
      <RoleProvider>
        {children}
      </RoleProvider>
    </ThemeContext.Provider>
  );
}
