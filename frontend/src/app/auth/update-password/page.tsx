"use client";

import { useState, useEffect } from "react";
import { Lock, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, LayoutDashboard } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const inputCls = "w-full rounded-xl border border-[#1E2F55] bg-[#0C1529] py-3.5 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-[#20E7F2]/50 focus:ring-1 focus:ring-[#20E7F2]/20";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setSessionReady(true);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => router.replace("/login"), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        {success ? (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[1.75rem] font-bold text-white mb-2">Password updated</h2>
              <p className="text-[14px] text-white/50 leading-relaxed">
                Your password has been changed successfully.<br />
                Redirecting you to sign in…
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-8 py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
            >
              <LayoutDashboard className="h-4 w-4" /> Go to sign in
            </Link>
          </div>
        ) : !sessionReady ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#20E7F2]" />
            <p className="text-sm text-white/40">Verifying your reset link…</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-[1.75rem] font-bold text-white mb-1.5">Set your password</h1>
              <p className="text-[14px] text-white/50">Choose a strong password for your account.</p>
            </div>

            {error && (
              <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className={`${inputCls} pl-11 pr-12`}
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-white/30">Min. 8 characters, one number, one special character</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    className={`${inputCls} pl-11 pr-12`}
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#20E7F2] py-3.5 text-sm font-bold text-[#080E1A] transition hover:bg-[#20E7F2]/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
              </button>

              <Link
                href="/login"
                className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
