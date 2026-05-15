"use client";

import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[var(--background)] font-sans text-[var(--foreground)] antialiased overflow-y-auto">

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-indigo-500/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/4 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="w-full flex flex-col items-center pt-8 pb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-7 h-7 bg-[var(--card)] rounded-lg flex items-center justify-center border border-[var(--border)] shadow-sm">
            <span className="text-[var(--foreground)] font-bold text-sm">Z</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">ZoikoVertex</span>
        </div>
        <p className="text-[10px] text-[var(--foreground-muted)] font-semibold uppercase tracking-[0.15em]">
          Where Execution Becomes Accountable.
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-fit animate-in fade-in slide-in-from-bottom-3 duration-500">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-10 text-center relative z-10 opacity-30 hover:opacity-70 transition-opacity duration-300">
        <p className="text-[9px] text-[var(--foreground-muted)] font-bold uppercase tracking-[0.25em]">
          ZOIKO INDUSTRIES © 2026
        </p>
      </footer>
    </div>
  );
}
