"use client";

import { useState } from "react";
import { Send, ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
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
      <div className="w-full max-w-[480px] rounded-[32px] border border-slate-200/70 bg-white/95 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 shadow-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-950">Reset Password</h1>
          <p className="mt-3 text-sm text-slate-500">We’ll send password reset instructions to your work email.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!success ? (
          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Work Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@yourcompany.com"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Reset Instructions
            </button>
          </form>
        ) : (
          <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-slate-50 p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-sky-100 text-sky-700">
              <Send className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold text-slate-950">Check your inbox</h2>
            <p className="text-sm leading-7 text-slate-600">
              If an account exists for this email, you’ll receive a secure reset link within a few minutes.
            </p>
          </div>
        )}

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <Link href="/login" className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          <ArrowLeft className="h-4 w-4" /> Back to Sign In
        </Link>

        <div className="mt-8 rounded-3xl border border-slate-200/70 bg-slate-50 p-5 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-2xl bg-sky-100 p-2 text-sky-700">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Security notice</p>
              <p className="mt-2 leading-6">
                Reset links expire after 60 minutes and can only be used once. If you use SSO to sign in, please contact your administrator to reset your password.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}
