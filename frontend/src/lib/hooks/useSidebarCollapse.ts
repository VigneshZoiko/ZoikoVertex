"use client";

import { useState, useEffect } from "react";

const KEY = "sidebar_collapse_enabled";

export function useSidebarCollapse() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(KEY) === "true";
  });

  useEffect(() => {
    const sync = () => setEnabled(localStorage.getItem(KEY) === "true");
    window.addEventListener("sidebar-collapse-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sidebar-collapse-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setCollapse = (value: boolean) => {
    localStorage.setItem(KEY, String(value));
    window.dispatchEvent(new Event("sidebar-collapse-changed"));
    setEnabled(value);
  };

  return { enabled, setCollapse };
}
