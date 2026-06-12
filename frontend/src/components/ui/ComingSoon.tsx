"use client";

import { Rocket, Clock, ArrowLeft, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
}

export default function ComingSoon({ 
  title, 
  description = "We're currently engineering this module to meet Enterprise standards. Stay tuned for a world-class experience.",
  icon: Icon = Rocket 
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--accent)]/10 blur-[120px] rounded-full -z-10 animate-pulse" />
      
      {/* Icon with Ring */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[var(--accent)]/20 blur-2xl rounded-full" />
        <div className="relative w-24 h-24 bg-[var(--card)] border border-[var(--border)] rounded-3xl flex items-center justify-center shadow-2xl group transition-transform hover:scale-105 duration-500">
          <Icon className="w-12 h-12 text-[var(--accent)] animate-bounce-slow" />
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-[var(--warning-text)] animate-pulse" />
        </div>
      </div>

      {/* Text Content */}
      <div className="max-w-md space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info-text)] text-xs font-bold uppercase tracking-widest mb-2">
          <Clock className="w-3 h-3" />
          Coming Soon
        </div>
        <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)]">
          {title}
        </h1>
        <p className="text-[var(--foreground-muted)] text-lg leading-relaxed">
          {description}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-6 py-3 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--foreground)] font-bold rounded-2xl transition-all border border-[var(--border)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-[var(--accent)] text-[var(--accent-foreground)] font-bold rounded-2xl transition-all shadow-lg shadow-[var(--accent)]/25 active:scale-95 hover:brightness-110"
        >
          Return to Dashboard
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="mt-16 w-full max-w-xs space-y-2">
        <div className="flex justify-between text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
          <span>Development Progress</span>
          <span>75%</span>
        </div>
        <div className="h-1.5 w-full bg-[var(--surface)] rounded-full overflow-hidden border border-[var(--border)]">
          <div className="h-full bg-gradient-to-r from-[var(--accent)] to-[color-mix(in_srgb,var(--accent),black_40%)] w-[75%] rounded-full" />
        </div>
      </div>
    </div>
  );
}
