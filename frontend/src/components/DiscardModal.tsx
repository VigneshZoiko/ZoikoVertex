"use client";

import { AlertTriangle, X } from "lucide-react";
import { Modal } from "@/components/ui/primitives";

interface DiscardModalProps {
  isOpen: boolean;
  pendingHref: string | null;
  onConfirm: () => void;   // discard draft and navigate
  onCancel: () => void;    // stay on page
}

export default function DiscardModal({ isOpen, pendingHref, onConfirm, onCancel }: DiscardModalProps) {
  if (!isOpen) return null;

  return (
    <Modal open={isOpen} onClose={onCancel} size="sm" showCloseButton={false}>
      <div className="-m-6">
        <div className="h-1 rounded-t-2xl bg-[var(--warning-text)]" />

        <button
          onClick={onCancel}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className="w-14 h-14 bg-[var(--warning-bg)] border-[var(--warning-border)] rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-7 h-7 text-[var(--warning-text)]" />
          </div>

          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">Discard this draft?</h2>
          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-6">
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
              className="flex-1 py-3 rounded-xl bg-[var(--error-text)] text-foreground font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[var(--error-text)]/20"
            >
              Yes, Discard
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
