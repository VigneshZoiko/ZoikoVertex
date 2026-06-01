"use client";

import { useState } from "react";
import { ArrowLeft, Send, Loader2, Mail } from "lucide-react";
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
      <div className="w-full max-w-[480px]">
        {!success ? (
          <>
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                <div className="h-px w-5 bg-[#20E7F2]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20E7F2]">
                  Password Reset
                </span>
              </div>
              <h1 className="text-[1.75rem] font-black text-white/90 mb-2">Forgot your password?</h1>
              <p className="text-[14px] text-white/45 leading-relaxed">
                Enter your work email and we&apos;ll send you a secure reset link.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@company.com"
                    className="w-full rounded-xl border border-[#1E2F55] bg-[#0C1529] pl-11 pr-4 py-3.5 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-[#20E7F2]/50 focus:ring-1 focus:ring-[#20E7F2]/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#20E7F2] py-3.5 text-sm font-bold text-[#080E1A] transition hover:bg-[#20E7F2]/90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send reset link
              </button>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(32,231,242,0.1)] border border-[rgba(32,231,242,0.18)]">
              <Mail className="h-7 w-7 text-[#20E7F2]" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="h-px w-5 bg-[#20E7F2]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20E7F2]">Email sent</span>
              <div className="h-px w-5 bg-[#20E7F2]" />
            </div>
            <h2 className="text-2xl font-black text-white/90 mb-3">Check your inbox</h2>
            <p className="text-[14px] text-white/45 leading-relaxed mb-8">
              If an account exists for <span className="text-white/70 font-medium">{email}</span>,<br />
              you&apos;ll receive a reset link within a few minutes.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-8 py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
