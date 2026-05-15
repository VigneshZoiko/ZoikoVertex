"use client";

import { ShieldAlert, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PendingApproval({ orgName }: { orgName?: string }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--background)] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-[var(--card)] border border-[var(--border)] rounded-3xl p-12 text-center shadow-2xl shadow-black/30 animate-in fade-in zoom-in duration-500">

        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-indigo-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-4 tracking-tight">
          Account Pending Approval
        </h1>

        <p className="text-[var(--foreground-muted)] text-sm leading-relaxed mb-10">
          Your organization{" "}
          <span className="text-[var(--foreground)] font-semibold">{orgName || "registration"}</span>{" "}
          has been successfully received and is currently under review by our{" "}
          <span className="text-indigo-400 font-semibold">Workspace Owner Governance</span> team.
        </p>

        <div className="space-y-3">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                Current Status
              </p>
              <p className="text-sm font-bold text-[var(--foreground)]">Validation in Progress</p>
            </div>
          </div>

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
