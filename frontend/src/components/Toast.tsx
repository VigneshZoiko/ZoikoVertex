'use client';

import { useEffect, useState, useCallback } from 'react';
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

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(dismiss, duration);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [duration, dismiss]);

  const isSuccess = type === 'success';

  return (
    <div
      className={`fixed top-6 right-6 z-[9999] flex items-start gap-3 px-4 py-3.5 rounded-2xl shadow-2xl border max-w-sm min-w-[300px] transition-all duration-300 backdrop-blur-md ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3'
      } ${
        isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/30'
          : 'bg-rose-950/90 border-rose-500/30'
      }`}
    >
      {isSuccess
        ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
        : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
      }
      <p className={`flex-1 text-sm font-medium leading-snug ${isSuccess ? 'text-emerald-200' : 'text-rose-200'}`}>
        {message}
      </p>
      <button
        onClick={dismiss}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Close notification"
      >
        <X className={`w-3.5 h-3.5 ${isSuccess ? 'text-emerald-300' : 'text-rose-300'}`} />
      </button>

      {/* Progress bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden ${isSuccess ? 'bg-emerald-900' : 'bg-rose-900'}`}>
        <div
          className={`h-full rounded-full ${isSuccess ? 'bg-emerald-400' : 'bg-rose-400'}`}
          style={{
            animation: `toast-shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
