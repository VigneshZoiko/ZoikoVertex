"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, ShieldAlert, Crown, Lock } from "lucide-react";
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

  // If already logged in as superadmin, skip straight to /superadmin
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const result = await api.get("/api/v1/user/context");
        if (result?.success && result.data?.is_superadmin) {
          router.replace("/superadmin");
          return;
        }
        // Logged in but not superadmin — sign them out to avoid confusion
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

      // Verify SUPERADMIN status from backend
      const result = await api.get("/api/v1/user/context");
      if (!result?.success || !result.data?.is_superadmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have Platform Owner privileges.");
      }

      document.cookie = "zv_auth=1; path=/; SameSite=Strict; max-age=3600";
      router.replace("/superadmin");
    } catch (err: any) {
      setError(err.message || "Authentication failed.");
      setLoading(false);
    }
  };

  if (checking) {
    return <div className="min-h-screen bg-[#080808]" />;
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col antialiased">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-amber-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-64 w-full bg-[radial-gradient(ellipse_at_bottom,rgba(245,158,11,0.04),transparent_60%)]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Image
          src="/images/logo-wordmark.svg"
          alt="ZoikoVertex"
          width={140}
          height={28}
          className="h-7 w-auto opacity-60 brightness-0 invert"
        />
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase text-amber-500/80">
          <ShieldAlert className="h-3.5 w-3.5" />
          Restricted Access
        </span>
      </header>

      {/* Main */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[420px]">
          {/* Card */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-8 shadow-[0_0_80px_rgba(0,0,0,0.6)] backdrop-blur-sm">
            {/* Icon + title */}
            <div className="mb-8 text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <Crown className="h-7 w-7 text-amber-400" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Platform Owner Access</h1>
              <p className="mt-2 text-sm text-white/40">
                This portal is restricted to authorised platform administrators only.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Locked email badge */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
                  Account
                </label>
                <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-4 py-3">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500/60" />
                  <span className="text-sm font-medium text-white/50">{PLATFORM_EMAIL}</span>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30">
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                {loading ? "Authenticating…" : "Access Platform"}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-white/20 leading-5">
            All access to this portal is logged and monitored.
            <br />
            Unauthorised access attempts are reported.
          </p>

          <div className="mt-6 text-center">
            <a
              href="/login"
              className="text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2"
            >
              Workspace login &rarr;
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
