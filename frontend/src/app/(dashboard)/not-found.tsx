"use client";

import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 animate-in fade-in zoom-in-95 duration-500">
      {/* Icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-amber-500/20 blur-[80px] rounded-full animate-pulse" />
        <div className="relative w-24 h-24 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] flex items-center justify-center shadow-2xl">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--card)] border border-[var(--border)] rounded-xl flex items-center justify-center text-xs font-black text-amber-400">
          404
        </div>
      </div>

      {/* Text */}
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-3 tracking-tight">
        Page Not Found
      </h1>
      <p className="text-[var(--foreground-muted)] max-w-sm mb-8 text-sm leading-relaxed">
        This page is still under construction or doesn&apos;t exist yet. Head back to the dashboard to continue.
      </p>

      {/* Action */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95"
      >
        <Home className="w-4 h-4" />
        Go to Dashboard
      </Link>
    </div>
  );
}
