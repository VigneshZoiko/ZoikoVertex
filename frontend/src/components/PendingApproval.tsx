"use client";

import { ShieldAlert, Loader2, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function PendingApproval({ orgName }: { orgName?: string }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#111111] flex items-center justify-center p-6">
      <div className="w-full max-w-[440px] bg-[#1a1a1a] border border-[#2d2d2d] rounded-[32px] p-12 text-center shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-4 tracking-tight">Account Pending Approval</h1>
        
        <p className="text-[#888888] text-[14px] leading-relaxed mb-10">
          Your organization <span className="text-white font-semibold">{orgName || "registration"}</span> has been successfully received and is currently under review by our <span className="text-indigo-400 font-semibold">Workspace Owner Governance</span> team.
        </p>

        <div className="space-y-4">
          <div className="bg-[#111111] border border-[#2d2d2d] rounded-2xl p-5 flex items-center gap-4 text-left">
            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            </div>
            <div>
              <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-0.5">Current Status</p>
              <p className="text-sm font-bold text-white">Validation in Progress</p>
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full h-[52px] flex items-center justify-center gap-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 rounded-2xl transition-all font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <p className="mt-10 text-[11px] font-bold text-zinc-600 uppercase tracking-[0.2em]">
          ZoikoVertex Enterprise Protocol
        </p>
      </div>
    </div>
  );
}
