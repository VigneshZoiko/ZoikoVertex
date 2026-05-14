"use client";

import { useState, useEffect } from "react";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    workEmail: "",
    companyName: "",
    workspaceName: "",
    password: "",
    confirmPassword: "",
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let strength = 0;
    if (formData.password.length >= 8) strength += 25;
    if (/[A-Z]/.test(formData.password)) strength += 25;
    if (/[0-9]/.test(formData.password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(formData.password)) strength += 25;
    setPasswordStrength(strength);
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/v1/auth/signup-enterprise', {
        fullName: formData.fullName,
        workEmail: formData.workEmail,
        companyName: formData.companyName,
        workspaceName: formData.workspaceName,
        password: formData.password
      });

      if (response.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Signup failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[400px] p-10 bg-[#1a1a1a] rounded-[24px] border border-[#2d2d2d] text-center animate-in zoom-in">
          <div className="w-14 h-14 bg-[#4d47ff]/10 text-[#4d47ff] rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-[20px] font-bold text-white mb-2">Request Submitted</h2>
          <p className="text-[#888888] text-[13px] mb-8 leading-relaxed">
            Your organization <span className="text-white font-bold">{formData.companyName}</span> is awaiting <span className="text-[#4d47ff] font-bold">Workspace Owner Approval</span>. You will receive an email once your workspace is activated.
          </p>
          <Link href="/login" className="w-full h-[46px] inline-flex items-center justify-center bg-[#4d47ff] text-white font-bold text-[14px] rounded-lg hover:opacity-90 transition-all">
            Return to Login
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[540px]">
        <div className="bg-[#1a1a1a] p-8 rounded-[24px] border border-[#2d2d2d] shadow-2xl">
          
          <div className="mb-6 text-center">
            <h2 className="text-[22px] font-bold text-white mb-1.5 tracking-tight">Register Organization</h2>
            <p className="text-[#888888] text-[12px] font-medium tracking-wide opacity-80">Establish your secure governance node.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold rounded-lg">{error}</div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Full Name</label>
                <input name="fullName" required value={formData.fullName} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Work Email</label>
                <input name="workEmail" type="email" required value={formData.workEmail} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Organization</label>
                <input name="companyName" required value={formData.companyName} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="Zoiko Industries"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Workspace ID</label>
                <input name="workspaceName" required value={formData.workspaceName} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="marketing-hq"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Password</label>
                <input name="password" type="password" required value={formData.password} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="Min 8 chars"
                />
                <div className="h-0.5 w-full bg-[#111111] rounded-full mt-1.5 overflow-hidden opacity-50">
                   <div className={`h-full transition-all duration-700 ${passwordStrength <= 25 ? 'bg-red-500' : passwordStrength <= 50 ? 'bg-orange-500' : passwordStrength <= 75 ? 'bg-yellow-500' : 'bg-[#4d47ff]'}`} style={{ width: `${passwordStrength}%` }} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-white ml-0.5 opacity-90">Confirm</label>
                <input name="confirmPassword" type="password" required value={formData.confirmPassword} onChange={handleChange}
                  className="w-full h-[42px] bg-[#111111] border border-[#2d2d2d] rounded-lg px-4 text-[13px] text-white placeholder-[#333333] focus:outline-none focus:border-[#4d47ff]/50 transition-all"
                  placeholder="Repeat pwd"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full h-[46px] bg-[#4d47ff] text-white font-bold text-[14px] rounded-lg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 mt-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create Account <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[12px] font-medium text-[#666666]">
          Already have an account? <Link href="/login" className="text-white hover:text-[#4d47ff] font-bold ml-1 transition-colors">Sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
