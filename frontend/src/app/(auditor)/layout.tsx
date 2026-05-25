"use client";

import { Shield } from "lucide-react";

export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--background,#111)] text-[var(--foreground,#eee)] min-h-screen flex flex-col font-sans">
      <header className="h-16 border-b border-[var(--border,#2a2a2a)] bg-[var(--surface,#1a1a1a)] px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <span className="font-semibold tracking-tight">ZoikoVertex</span>
          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium uppercase tracking-wider ml-2">
            Auditor View
          </span>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
