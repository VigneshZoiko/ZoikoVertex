"use client";

import { useState } from "react";
import { Send, ArrowLeft, Loader2, Info } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="bg-[#1a1a1a] p-8 rounded-[20px] border border-[#2d2d2d] shadow-2xl relative">
          
          <div className="mb-6 text-center">
            <h2 className="text-[20px] font-bold text-white mb-1.5 tracking-tight">Identity Recovery</h2>
            <p className="text-[#888888] text-[12px] font-medium leading-relaxed opacity-90">
              Request a secure recovery link.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold rounded-lg">{error}</div>
          )}

          {!success ? (
            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Work Email</label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="name@zoikogroup.com"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full h-[46px] bg-[#4d47ff] text-white font-bold text-[14px] rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 mt-2">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5" /> Request Link</>}
              </button>
            </form>
          ) : (
            <div className="p-6 bg-[#4d47ff]/5 rounded-[16px] border border-[#4d47ff]/10 animate-in zoom-in text-center">
               <h4 className="text-[16px] font-bold text-white mb-1">Check Inbox</h4>
               <p className="text-[12px] text-[#888888] font-medium">Link sent to your email.</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#2d2d2d]/50 flex justify-center">
            <Link href="/login" className="group flex items-center gap-2 text-[12px] font-semibold text-[#666666] hover:text-white transition-all">
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" /> Back to Login
            </Link>
          </div>
        </div>

        {/* Compact Security Alert */}
        <div className="mt-6 p-4 bg-[#1a1a1a]/40 backdrop-blur-md rounded-[16px] border border-[#2d2d2d] flex items-start gap-3">
           <Info className="w-3.5 h-3.5 text-[#4d47ff] mt-0.5 shrink-0" />
           <div>
              <h4 className="text-[9px] font-bold text-white mb-0.5 uppercase tracking-widest opacity-80">Security notice</h4>
              <p className="text-[10px] text-[#666666] leading-relaxed font-medium">
                 Links expire after 60 mins. Contact IT for SSO issues.
              </p>
           </div>
        </div>
      </div>
    </AuthLayout>
  );
}
