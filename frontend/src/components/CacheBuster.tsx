"use client";

import { useEffect } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "";
const STORAGE_KEY = "zv_build_id";

export default function CacheBuster() {
  useEffect(() => {
    if (!BUILD_ID) return; // no build ID set, skip cache busting
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored !== BUILD_ID) {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      window.location.reload(); // one-time reload after new deployment
    } else {
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
    }
  }, []);

  return null;
}
