"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, Mail } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[480px] rounded-[32px] border border-slate-200/70 bg-white/95 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 shadow-sm">
            <Mail className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-2xl font-bold text-slate-950">Secure Workspace Access</h1>
          <p className="mt-3 text-sm text-slate-500">Sign in to access your ZoikoVertex workspace.</p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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

          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-slate-600">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              Remember me
            </label>
            <Link href="/reset-password" className="font-semibold text-slate-700 hover:text-slate-950">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Sign In Securely
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">SSO</span>
          Continue with SSO
        </button>

        <p className="mt-6 text-center text-sm text-slate-500">
          Protected by encryption and monitored access controls.
        </p>

        <p className="mt-6 text-center text-sm text-slate-500">
          Need an account?{' '}
          <Link href="/signup" className="font-semibold text-slate-950 hover:text-slate-700">
            Create workspace
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
