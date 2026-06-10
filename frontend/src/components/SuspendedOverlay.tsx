"use client";

import { CreditCard, LogOut, PauseCircle, Trash2, ArrowUpRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { useState } from "react";

interface Props {
  orgName?: string;
  type: "paused" | "banned" | "deleted" | "no_credits";
  planType?: string | null;
  premiumPaidUntil?: string | null;
  cycleResetDate?: string | null;
}

export default function SuspendedOverlay({ orgName, type, planType, cycleResetDate }: Props) {
  const router = useRouter();
  const [downgrading, setDowngrading] = useState(false);
  const [downgradeError, setDowngradeError] = useState(false);

  const isPlanExpiry = type === "paused";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleDowngradeToFree = async () => {
    setDowngrading(true);
    try {
      await api.post("/api/v1/user/downgrade-to-free", {});
      window.location.reload();
    } catch {
      setDowngradeError(true);
    } finally {
      setDowngrading(false);
    }
  };

  /* ── No Credits (AI suspended, billing cycle not yet reset) ──────────────── */
  if (type === "no_credits") {
    return (
      <div className="fixed inset-0 z-[9999] bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] space-y-8">
          <div className="text-center space-y-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <CreditCard className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
                No Credits
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                AI services for
                {orgName && <span className="text-white font-medium"> {orgName}</span>} are suspended — your wallet balance reached $0.
              </p>
              {cycleResetDate && (
                <p className="text-xs text-zinc-500 mt-1">
                  Services resume automatically on{" "}
                  <span className="text-zinc-300">{new Date(cycleResetDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {" "}or top up now to restore access immediately.
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-800" />

          <div className="space-y-3">
            <Link
              href="/admin/billing"
              className="w-full h-11 flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors text-sm font-medium"
            >
              Top Up Credits
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              className="w-full h-11 flex items-center justify-center gap-2 border border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Plan Expired ─────────────────────────────────────────────────────────── */
  if (isPlanExpiry) {
    return (
      <div className="fixed inset-0 z-[9999] bg-card flex items-center justify-center p-6">
        <div className="w-full max-w-[420px] space-y-8">

          {/* Icon + heading */}
          <div className="text-center space-y-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-hover border border-border">
              <CreditCard className="w-5 h-5 text-foreground-muted" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                Plan Expired
              </h2>
              <p className="text-sm text-foreground-muted leading-relaxed">
                Your organization
                {orgName && <span className="text-foreground font-medium"> {orgName}</span>}&apos;s{" "}
                <span className="text-foreground font-medium">{planType ?? "paid"}</span> plan has expired.
                Renew to restore full access or continue on the free tier.
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/admin/billing"
              className="w-full h-11 flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors text-sm font-medium"
            >
              Renew Plan
              <ArrowUpRight className="w-4 h-4" />
            </Link>

            <button
              onClick={handleDowngradeToFree}
              disabled={downgrading}
              className="w-full h-11 flex items-center justify-center gap-2 bg-card border border-border text-foreground-muted hover:text-white hover:border-border rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downgrading && <Loader2 className="w-4 h-4 animate-spin" />}
              {downgrading ? "Switching…" : "Continue with Free Plan"}
            </button>
            {downgradeError && (
              <p className="text-xs text-rose-400 mt-2">Failed to downgrade. Please contact support.</p>
            )}

            <button
              onClick={handleLogout}
              className="w-full h-11 flex items-center justify-center gap-2 border border-border text-foreground-muted hover:text-foreground-muted hover:border-border rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

        </div>
      </div>
    );
  }

  /* ── Org Banned / Deleted ─────────────────────────────────────────────────── */
  const isDeleted = type === "deleted";
  const isBanned  = type === "banned";

  return (
    <div className="fixed inset-0 z-[9999] bg-card flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] space-y-8">

        <div className="text-center space-y-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-surface-hover border border-border">
            {isDeleted
              ? <Trash2 className="w-5 h-5 text-foreground-muted" />
              : <PauseCircle className="w-5 h-5 text-foreground-muted" />
            }
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Organization {isDeleted ? "Permanently Banned" : "Banned"}
            </h2>
            <p className="text-sm text-foreground-muted leading-relaxed">
              Your organization
              {orgName && <span className="text-foreground font-medium"> {orgName}</span>} has been{" "}
              {isDeleted ? "permanently banned" : "banned"}.
            </p>
            {isBanned && (
              <p className="text-sm text-foreground-muted leading-relaxed pt-1">
                Please{" "}
                <Link
                  href="/support"
                  className="text-foreground-muted hover:text-white underline underline-offset-2 transition-colors"
                >
                  contact support
                </Link>{" "}
                or visit our{" "}
                <Link
                  href="/docs"
                  className="text-foreground-muted hover:text-white underline underline-offset-2 transition-colors"
                >
                  documentation
                </Link>{" "}
                for assistance.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full h-11 flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="text-center text-[10px] font-semibold text-foreground-muted uppercase tracking-[0.18em]">
          ZoikoVertex · Platform Protocol
        </p>
      </div>
    </div>
  );
}
