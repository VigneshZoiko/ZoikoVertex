"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="w-full max-w-[400px]">
        <div className="bg-[var(--card)] p-8 rounded-2xl border border-[var(--border)] shadow-2xl shadow-black/20">

          <div className="mb-6">
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-1.5 tracking-tight">
              Secure Gateway
            </h2>
            <p className="text-[var(--foreground-muted)] text-xs font-medium leading-relaxed">
              Access your corporate workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--foreground)] ml-0.5 uppercase tracking-wider opacity-75">
                Corporate Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[42px] bg-[var(--background-subtle)] border border-[var(--border)] rounded-xl px-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                placeholder="name@zoikogroup.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--foreground)] ml-0.5 uppercase tracking-wider opacity-75">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[42px] bg-[var(--background-subtle)] border border-[var(--border)] rounded-xl px-4 pr-12 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link
                href="/reset-password"
                className="text-[11px] font-semibold text-[var(--foreground-muted)] hover:text-indigo-400 transition-colors duration-150"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[46px] bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-500 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2.5 mt-2 shadow-lg shadow-indigo-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <><Lock className="w-3.5 h-3.5" /> Authenticate</>
              }
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs font-medium text-[var(--foreground-muted)]">
          New here?{" "}
          <Link
            href="/signup"
            className="text-[var(--foreground)] hover:text-indigo-400 font-bold ml-1 transition-colors duration-150"
          >
            Register organization
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
