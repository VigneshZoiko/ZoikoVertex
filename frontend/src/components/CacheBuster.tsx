"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "1";
const STORAGE_KEY = "zv_build_id";

export default function CacheBuster() {
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== BUILD_ID) {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      window.location.reload();
    } else {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
    }
  }, []);

  return null;
}
