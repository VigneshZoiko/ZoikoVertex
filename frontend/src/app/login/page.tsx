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
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="bg-[#1a1a1a] p-8 rounded-[20px] border border-[#2d2d2d] shadow-2xl">
          
          <div className="mb-6">
            <h2 className="text-[20px] font-bold text-white mb-1.5 tracking-tight">Secure Gateway</h2>
            <p className="text-[#888888] text-[12px] font-medium leading-relaxed opacity-90">
              Access your corporate workspace.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Corporate Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                placeholder="name@zoikogroup.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Password</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 pr-12 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#444444] hover:text-[#888888] transition-colors">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/reset-password" title="Forgot password?" className="text-[11px] font-semibold text-[#666666] hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[46px] bg-[#4d47ff] text-white font-bold text-[14px] rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 mt-2 shadow-lg shadow-blue-900/10">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-3.5 h-3.5" /> Authenticate</>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12px] font-medium text-[#666666]">
          New here? <Link href="/signup" className="text-white hover:text-[#4d47ff] font-bold ml-1 transition-colors">Register organization</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
