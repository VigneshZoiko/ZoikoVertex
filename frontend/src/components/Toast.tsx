'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4500 }: ToastProps) {
  const [visible, setVisible] = useState(false);
  // Render into document.body via a portal so the toast escapes any parent
  // stacking context (e.g. the page-transition wrapper) — otherwise the sticky
  // header paints over it despite a high z-index.
  const [mounted, setMounted] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(dismiss, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, dismiss]);

  const isSuccess = type === 'success';

  if (!mounted) return null;

  return createPortal(
    <div
      className={`fixed top-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-sm min-w-[300px] transition-all duration-300 backdrop-blur-md ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      } ${
        isSuccess
          ? 'bg-[var(--toast-success-bg)] border-[var(--success-border)]'
          : 'bg-[var(--toast-error-bg)] border-[var(--error-border)]'
      }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-[var(--toast-success-text)]" />
        : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[var(--toast-error-text)]" />
      }
      <p className={`flex-1 text-sm font-medium leading-snug ${isSuccess ? 'text-[var(--toast-success-text)]' : 'text-[var(--toast-error-text)]'}`}>
        {message}
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Close notification"
      >
        <X className={`w-3.5 h-3.5 ${isSuccess ? 'text-[var(--toast-success-text)]' : 'text-[var(--toast-error-text)]'}`} />
      </button>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden ${isSuccess ? 'bg-[var(--toast-success-bg)]' : 'bg-[var(--toast-error-bg)]'}`}>
        <div
          className={`h-full rounded-full ${isSuccess ? 'bg-[var(--toast-success-text)]' : 'bg-[var(--toast-error-text)]'}`}
          style={{
            animation: `toast-shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>,
    document.body
  );
}
