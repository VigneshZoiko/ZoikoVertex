"use client";

import { PauseCircle, Trash2, LogOut, CreditCard, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useState } from "react";

interface Props {
  orgName?: string;
  type: 'paused' | 'deleted';
  planType?: string | null;
  premiumPaidUntil?: string | null;
}

export default function SuspendedOverlay({ orgName, type, planType, premiumPaidUntil }: Props) {
  const router = useRouter();
  const [downgrading, setDowngrading] = useState(false);

  const isPaused = type === 'paused';
  const isPlanExpiry = isPaused;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleDowngradeToFree = async () => {
    setDowngrading(true);
    try {
      await api.post('/api/v1/user/downgrade-to-free', {});
      window.location.reload();
    } catch {
      alert("Failed to downgrade. Please contact support.");
    } finally {
      setDowngrading(false);
    }
  };

  if (isPlanExpiry) {
    return (
      <div className="flex items-center justify-center min-h-full p-6">
        <div className="w-full max-w-[440px] bg-[var(--card)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-2xl shadow-black/30 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 shadow-lg shadow-amber-500/10 flex items-center justify-center mx-auto mb-8">
            <CreditCard className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
            Plan Expired
          </h2>

          <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-8">
            Your organization{orgName && <span className="text-[var(--foreground)] font-semibold"> {orgName}</span>}&apos;s
            <span className="text-[var(--foreground)] font-semibold"> {planType}</span> plan has expired.
            Renew to restore full access or switch to the Free plan.
          </p>

          <div className="space-y-3">
            <Link
              href="/admin/billing"
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all duration-200 font-bold text-sm"
            >
              <Sparkles className="w-4 h-4" />
              Renew Plan
            </Link>

            <button
              onClick={handleDowngradeToFree}
              disabled={downgrading}
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:border-[var(--card-border)] rounded-2xl transition-all duration-200 font-bold text-sm disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {downgrading ? 'Downgrading...' : 'Continue with Free Plan'}
            </button>

            <button
              onClick={handleLogout}
              className="w-full h-[52px] flex items-center justify-center gap-3 bg-transparent border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] rounded-2xl transition-all duration-200 font-bold text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <p className="mt-10 text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.2em] opacity-50">
            ZoikoVertex Enterprise Protocol
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-full p-6">
      <div className="w-full max-w-[440px] bg-[var(--card)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-2xl shadow-black/30 animate-in fade-in zoom-in duration-500">

        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg ${
          isPaused
            ? 'bg-amber-500/10 text-amber-400 shadow-amber-500/10'
            : 'bg-rose-500/10 text-rose-400 shadow-rose-500/10'
        }`}>
          {isPaused ? <PauseCircle className="w-8 h-8" /> : <Trash2 className="w-8 h-8" />}
        </div>

        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
          Organization {isPaused ? 'Paused' : 'Deleted'}
        </h2>

        <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-8">
          Your organization{" "}
          {orgName && <span className="text-[var(--foreground)] font-semibold">{orgName}</span>}{" "}
          has been {isPaused ? 'paused' : 'deactivated'}. You no longer have access to ZoikoVertex features.
        </p>

        <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-10">
          Please{" "}
          <Link href="/support" className="text-indigo-400 font-bold hover:text-indigo-300 underline underline-offset-2 transition-colors">
            contact your administrator
          </Link>{" "}
          through the Support & Docs page for assistance.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full h-[52px] flex items-center justify-center gap-3 bg-[var(--surface)] border border-[var(--border)] text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] hover:border-[var(--card-border)] rounded-2xl transition-all duration-200 font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="mt-10 text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-[0.2em] opacity-50">
          ZoikoVertex Enterprise Protocol
        </p>
      </div>
    </div>
  );
}
