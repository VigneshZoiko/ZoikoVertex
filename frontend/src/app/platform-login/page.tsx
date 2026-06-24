"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Shield, Lock, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import Image from "next/image";

const PLATFORM_EMAIL = "info@zoikogroup.com";

export default function PlatformLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const result = await api.get("/api/v1/user/context");
        if (result?.success && result.data?.is_superadmin) {
          router.replace("/superadmin/analytics");
          return;
        }
        await supabase.auth.signOut();
      }
      setChecking(false);
    });
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
        email: PLATFORM_EMAIL,
        password,
      });
      if (authError) throw authError;
      if (!session) throw new Error("Authentication failed.");

      const result = await api.get("/api/v1/user/context");
      if (!result?.success || !result.data?.is_superadmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have Platform Owner privileges.");
      }

      document.cookie = "zv_auth=1; path=/; SameSite=Strict; max-age=3600";
      router.replace("/superadmin/analytics");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex antialiased">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-zinc-900 border-r border-zinc-800 px-10 py-10">
        <div>
          <Image
            src="/images/zoikovertexlogo.png"
            alt="ZoikoVertex"
            width={148}
            height={30}
            className="h-7 w-auto brightness-0 invert opacity-90"
          />
        </div>

        <div className="space-y-8">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.3em] uppercase text-zinc-500 mb-3">
              Platform Administration
            </p>
            <h2 className="text-2xl font-bold text-white leading-snug">
              Centralised control for the entire platform.
            </h2>
            <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
              Manage workspaces, organisations, system-wide configuration, and platform health from a single secure interface.
            </p>
          </div>

          <div className="space-y-3">
            {[
              "Workspace & organisation management",
              "System-wide billing and subscriptions",
              "Platform health and diagnostics",
              "Audit logs and access controls",
            ].map((item) => (
              <div key={item} className="flex items-start gap-3">
                <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full border border-zinc-600 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>
                <span className="text-sm text-zinc-400">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600">
          &copy; {new Date().getFullYear()} ZoikoGroup. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col">
        {/* Top bar (mobile logo + badge) */}
        <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800 lg:justify-end">
          <Image
            src="/images/zoikovertexlogo.png"
            alt="ZoikoVertex"
            width={130}
            height={26}
            className="h-6 w-auto brightness-0 invert opacity-70 lg:hidden"
          />
          <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.25em] uppercase text-zinc-500">
            <Shield className="h-3 w-3" />
            Restricted Portal
          </span>
        </header>

        {/* Form area */}
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <div className="w-full max-w-[380px]">

            <div className="mb-8">
              <h1 className="text-[22px] font-bold text-white tracking-tight">Platform Owner Login</h1>
              <p className="mt-1.5 text-sm text-zinc-500">
                Authorised person only. All sessions are recorded.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Locked account */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold tracking-[0.25em] uppercase text-zinc-500">
                  Account
                </label>
                <div className="flex items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-600" />
                  <span className="text-sm text-zinc-400 font-medium">{PLATFORM_EMAIL}</span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold tracking-[0.25em] uppercase text-zinc-500">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 pr-11 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-zinc-600 focus:ring-1 focus:ring-zinc-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-zinc-100 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                This portal is monitored. Unauthorised access attempts are logged and reported to system administrators.
              </p>
              <a
                href="/login"
                className="mt-4 inline-block text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2"
              >
                Go to workspace login
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
