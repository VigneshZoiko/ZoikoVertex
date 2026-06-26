"use client";

import { AlertTriangle, Edit3, X } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";

interface DiscardModalProps {
  isOpen: boolean;
  pendingHref: string | null;
  onConfirm: () => void;   // discard draft and navigate
  onCancel: () => void;    // stay on page
  onSaveDraft?: () => void; // save draft then navigate
}

export default function DiscardModal({ isOpen, pendingHref, onConfirm, onCancel, onSaveDraft }: DiscardModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onCancel]);

  // Scroll-lock
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
        {/* Top accent */}
        <div className="h-1 rounded-t-3xl bg-[var(--warning-text)]" />

        <div className="p-8">
          {/* Icon */}
          <div className="w-14 h-14 bg-[var(--warning-bg)] border-[var(--warning-border)] rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-7 h-7 text-[var(--warning-text)]" />
          </div>

          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Discard this draft?</h2>
          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-8">
            You have an unsaved post in progress. If you leave now, your topic, description, and media selection will be lost.
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onSaveDraft}
              className="w-full py-3 rounded-xl bg-info-text text-foreground font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-info-text/20 flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Save to Draft
            </button>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm hover:bg-[var(--surface-hover)] transition-all"
              >
                Keep Editing
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-xl bg-[var(--error-text)] text-foreground font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[var(--error-text)]/20"
              >
                Yes, Discard
              </button>
            </div>
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
    </div>,
    document.body
  );
}
