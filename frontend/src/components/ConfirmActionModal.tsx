"use client";

import { useEffect, useState, useRef } from "react";
import {
  AlertTriangle,
  X,
  ShieldAlert,
  Trash2,
  Power,
  LogOut,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { createPortal } from "react-dom";

type Variant = "danger" | "warning" | "info" | "default";

interface ConfirmActionModalProps {
  open: boolean;
  mode?: "confirm" | "prompt";
  variant?: Variant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Placeholder for prompt mode */
  promptPlaceholder?: string;
  /** Default value for prompt mode */
  promptDefault?: string;
  /** Show a required textarea for reason input (works in both modes) */
  requireReason?: boolean;
  reasonPlaceholder?: string;
  /** Loading state */
  loading?: boolean;
  /** Hide cancel button (for alert-like behavior) */
  hideCancel?: boolean;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

const VARIANT_STYLES: Record<
  Variant,
  {
    icon: typeof AlertTriangle;
    iconBg: string;
    iconColor: string;
    btnBg: string;
    btnHover: string;
    btnShadow: string;
  }
> = {
  danger: {
    icon: Trash2,
    iconBg: "bg-[var(--error-bg)] border-[var(--error-border)]",
    iconColor: "text-[var(--error-text)]",
    btnBg: "bg-[var(--error-text)]",
    btnHover: "hover:brightness-110",
    btnShadow: "shadow-lg shadow-[var(--error-text)]/20",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-[var(--warning-bg)] border-[var(--warning-border)]",
    iconColor: "text-[var(--warning-text)]",
    btnBg: "bg-[var(--warning-text)]",
    btnHover: "hover:brightness-110",
    btnShadow: "shadow-lg shadow-[var(--warning-text)]/20",
  },
  info: {
    icon: ShieldAlert,
    iconBg: "bg-[var(--info-bg)] border-[var(--info-border)]",
    iconColor: "text-[var(--info-text)]",
    btnBg: "bg-[var(--info-text)]",
    btnHover: "hover:brightness-110",
    btnShadow: "shadow-lg shadow-[var(--info-text)]/20",
  },
  default: {
    icon: AlertCircle,
    iconBg: "bg-[var(--surface)] border-[var(--border)]",
    iconColor: "text-[var(--foreground-muted)]",
    btnBg: "bg-[var(--surface-hover)]",
    btnHover: "hover:bg-[var(--border)]",
    btnShadow: "shadow-lg shadow-black/20",
  },
};

export default function ConfirmActionModal({
  open,
  mode = "confirm",
  variant = "danger",
  title,
  message,
  confirmLabel,
  cancelLabel,
  promptPlaceholder,
  promptDefault,
  requireReason,
  reasonPlaceholder,
  loading,
  hideCancel,
  onConfirm,
  onCancel,
}: ConfirmActionModalProps) {
  const [inputValue, setInputValue] = useState(promptDefault || "");
  const [reasonValue, setReasonValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setInputValue(promptDefault || "");
      setReasonValue("");
    }
  }, [open, promptDefault]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (mode === "prompt" && inputRef.current) inputRef.current.focus();
      else if (requireReason && textareaRef.current)
        textareaRef.current.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [open, mode, requireReason]);

  if (!open) return null;
  if (typeof window === "undefined") {
    return null;
  }
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;
  const canConfirm =
    mode === "confirm"
      ? requireReason
        ? reasonValue.trim().length > 0
        : true
      : inputValue.trim().length > 0;

  const handleConfirm = () => {
    if (mode === "prompt") {
      onConfirm(inputValue);
    } else if (requireReason) {
      onConfirm(reasonValue);
    } else {
      onConfirm();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />
      <div className="relative z-10 w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-200">
        <div
          className={`h-1 rounded-t-3xl ${variant === "danger" ? "bg-[var(--error-text)]" : variant === "warning" ? "bg-[var(--warning-text)]" : variant === "info" ? "bg-[var(--info-text)]" : "bg-[var(--foreground-muted)]"}`}
        />
        <div className="p-8">
          <div
            className={`w-14 h-14 ${styles.iconBg} border rounded-2xl flex items-center justify-center mb-6`}
          >
            <Icon className={`w-7 h-7 ${styles.iconColor}`} />
          </div>
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
            {title}
          </h2>
          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-6">
            {message}
          </p>

          {/* Prompt text input */}
          {mode === "prompt" && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={promptPlaceholder || "Enter value..."}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none mb-6"
              onKeyDown={(e) => {
                if (e.key === "Enter" && canConfirm) handleConfirm();
              }}
            />
          )}

          {/* Reason textarea */}
          {requireReason && (
            <textarea
              ref={textareaRef}
              value={reasonValue}
              onChange={(e) => setReasonValue(e.target.value)}
              placeholder={reasonPlaceholder || "Provide a reason..."}
              rows={3}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--border-hover)] focus:outline-none resize-none mb-6"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && canConfirm)
                  handleConfirm();
              }}
            />
          )}

          <div className="flex gap-3">
            {!hideCancel && (
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm hover:bg-[var(--surface-hover)] transition-all disabled:opacity-50"
              >
                {cancelLabel || "Cancel"}
              </button>
            )}
            <button
              onClick={handleConfirm}
              disabled={loading || !canConfirm}
              className={`flex-1 py-3 rounded-xl ${styles.btnBg} text-foreground font-bold text-sm ${styles.btnHover} active:scale-[0.98] transition-all ${styles.btnShadow} disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {confirmLabel || (mode === "prompt" ? "Submit" : "Confirm")}
            </button>
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-hover)] flex items-center justify-center text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-all disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
