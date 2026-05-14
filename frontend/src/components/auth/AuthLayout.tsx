"use client";

import React from "react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex flex-col bg-[#111111] font-sans text-white selection:bg-[#4d47ff]/30 antialiased overflow-y-auto">
      
      {/* Subtle Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#4d47ff]/5 rounded-full blur-[100px] opacity-30" />
      </div>

      {/* Compact Header */}
      <header className="w-full flex flex-col items-center pt-8 pb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-[28px] h-[28px] bg-[#1a1a1a] rounded-md flex items-center justify-center border border-[#2d2d2d] shadow-lg">
            <span className="text-white font-bold text-[15px]">Z</span>
          </div>
          <span className="text-[19px] font-bold tracking-tight">ZoikoVertex</span>
        </div>
        <p className="text-[10px] text-[#888888] font-semibold tracking-wide opacity-80 uppercase tracking-[0.1em]">
          Where Execution Becomes Accountable.
        </p>
      </header>

      {/* Main Content Area - Reduced Padding */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-fit animate-in fade-in slide-in-from-bottom-2 duration-500">
          {children}
        </div>
      </main>

      {/* Compact Footer */}
      <footer className="w-full py-6 px-10 text-center relative z-10 opacity-40 hover:opacity-100 transition-opacity">
        <p className="text-[9px] text-[#444444] font-bold uppercase tracking-[0.25em]">
          ZOIKO INDUSTRIES © 2026
        </p>
      </footer>
    </div>
  );
}
