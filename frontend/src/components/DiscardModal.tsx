"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect } from "react";

interface DiscardModalProps {
  isOpen: boolean;
  pendingHref: string | null;
  onConfirm: () => void;   // discard draft and navigate
  onCancel: () => void;    // stay on page
}

export default function DiscardModal({ isOpen, pendingHref, onConfirm, onCancel }: DiscardModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
        {/* Top accent */}
        <div className="h-1 rounded-t-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <div className="p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Discard this draft?</h2>
          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-8">
            You have an unsaved post in progress. If you leave now, your topic, description, and media selection will be lost.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm hover:bg-[var(--surface-hover)] transition-all"
            >
              Keep Editing
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-xl bg-rose-600 text-gray-900 dark:text-white font-bold text-sm hover:bg-rose-500 active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20"
            >
              Yes, Discard
            </button>
          </div>
        </div>

        {/* Close X */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
