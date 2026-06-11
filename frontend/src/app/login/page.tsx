"use client";

import { useState, useEffect, Suspense } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseReady } from "@/lib/supabase";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 21 21">
      <path fill="#f25022" d="M1 1h9v9H1z"/>
      <path fill="#00a4ef" d="M1 11h9v9H1z"/>
      <path fill="#7fba00" d="M11 1h9v9h-9z"/>
      <path fill="#ffb900" d="M11 11h9v9h-9z"/>
    </svg>
  );
}

const inputCls =
  "w-full rounded-xl border border-[#1E2F55] bg-[#0C1529] py-3.5 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-[#20E7F2]/50 focus:ring-1 focus:ring-[#20E7F2]/20";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupabaseReady) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const next = searchParams.get("next");
        router.replace(next && next.startsWith("/") ? next : "/dashboard");
      }
    }).catch((err: any) => {
      if (err?.message?.includes?.("Invalid Refresh Token") || err?.message?.includes?.("Refresh Token Not Found")) {
        supabase.auth.signOut();
        setError("Your session has expired. Please sign in again.");
      }
    });
  }, [router, searchParams]);

  useEffect(() => {
    if (searchParams.get("error") === "org_deleted") {
      setError("Your organization has been permanently deleted. Please contact support.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseReady) { setError("Authentication is not configured. Check environment variables."); return; }
    setLoading(true);
    setError("");
    try {
      const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      if (session) {
        document.cookie = "zv_auth=1; path=/; SameSite=Strict; max-age=3600";
      }
      const next = searchParams.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "azure") => {
    if (!isSupabaseReady) { setError("Authentication is not configured. Check environment variables."); return; }
    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to authenticate");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[480px]">
        <div className="mb-8">
          <h1 className="text-[1.75rem] font-bold text-white mb-1.5">Sign in to ZoikoVertex</h1>
          <p className="text-[14px] text-white/50">Access your corporate workspace.</p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* Email + password form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Work Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah@company.com"
                className={`${inputCls} pl-11 pr-4`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Password</label>
              <Link href="/reset-password" className="text-[13px] text-[#20E7F2] hover:text-[#20E7F2]/80 transition">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputCls} pl-11 pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-[#1E2F55] bg-[#0C1529] accent-[#20E7F2]"
            />
            <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
              Keep me signed in on this device
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#20E7F2] py-3.5 text-sm font-bold text-[#080E1A] transition hover:bg-[#20E7F2]/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ArrowRight className="h-4 w-4" /> Sign in</>}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">or continue with</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Social buttons — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60"
          >
            <GoogleIcon /> Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("azure")}
            disabled={loading}
            className="flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60"
          >
            <MicrosoftIcon /> Microsoft
          </button>
        </div>

        {/* ToS */}
        <p className="mt-6 text-center text-[12px] text-white/30 leading-relaxed">
          By signing in you agree to our{" "}
          <Link href="/terms" className="underline hover:text-white/50 transition">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-white/50 transition">Privacy Policy</Link>
        </p>

        {/* Sign up link */}
        <p className="mt-6 text-center text-[14px] text-white/40">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">
            Create one free
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
