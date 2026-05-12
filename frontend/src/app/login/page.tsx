"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid corporate email format").endsWith("@zoikogroup.com", "Must use a @zoikogroup.com email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<{email?: string, password?: string}>({});

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setValidationErrors({});

    // Zod Validation
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const formatted = result.error.format();
      setValidationErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-white/10">
            <span className="text-black font-bold text-2xl">Z</span>
          </div>
          <span className="text-white font-bold text-2xl tracking-wide">ZoikoVertex</span>
        </div>
        <p className="text-zinc-400 text-sm mt-2">Where Execution Becomes Accountable.</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-2">Secure Gateway</h2>
        <p className="text-sm text-zinc-400 mb-8">Enter your corporate credentials to access your workspace.</p>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Corporate Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-black border ${validationErrors.email ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors`}
              placeholder="name@zoikogroup.com"
            />
            {validationErrors.email && <p className="text-[10px] text-rose-500 mt-1 font-bold uppercase tracking-wider">{validationErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-black border ${validationErrors.password ? 'border-rose-500' : 'border-zinc-800'} rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 transition-colors pr-10`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {validationErrors.password && <p className="text-[10px] text-rose-500 mt-1 font-bold uppercase tracking-wider">{validationErrors.password}</p>}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full flex items-center justify-center py-2.5 ${loading ? 'bg-indigo-800 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-medium rounded-lg transition-colors mt-2`}
          >
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "Authenticating..." : "Authenticate"}
          </button>
        </form>
      </div>

      <div className="mt-12 text-xs text-zinc-600 font-medium tracking-wide">
        ZOIKO INDUSTRIES © 2026
      </div>
    </div>
  );
}
