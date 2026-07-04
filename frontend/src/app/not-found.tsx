"use client";

import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Watermark */}
      <span
        aria-hidden="true"
        className="pointer-events-none select-none text-[9rem] sm:text-[12rem] font-black leading-none text-[var(--foreground)]/5 tracking-tight"
      >
        404
      </span>

      {/* Text */}
      <h1 className="-mt-14 sm:-mt-16 text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
        Page not found.
      </h1>
      <p className="text-[var(--foreground-muted)] max-w-sm mb-8 text-sm leading-relaxed">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>

      {/* Action */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-6 py-3 bg-blue-500 hover:bg-blue-700 text-foreground font-semibold rounded-xl transition-all shadow-lg shadow-info-text/20 hover:scale-105 active:scale-95"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}
