"use client";

import { useState, useEffect } from "react";
import { Mail, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
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
        password: formData.password,
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

  return (
    <AuthLayout>
      <div className="w-full max-w-[520px] rounded-[32px] border border-slate-200/70 bg-white/95 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)]">
        {!success ? (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 shadow-sm">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-bold text-slate-950">Create Your Workspace</h1>
              <p className="mt-3 text-sm text-slate-500">Set up your organization and get secure access to the ZoikoVertex platform.</p>
            </div>

            {error && (
              <div className="mb-6 rounded-3xl border border-rose-200/80 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Full Name</span>
                  <input
                    name="fullName"
                    required
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Jane Doe"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Work Email</span>
                  <input
                    name="workEmail"
                    type="email"
                    required
                    value={formData.workEmail}
                    onChange={handleChange}
                    placeholder="name@yourcompany.com"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Company Name</span>
                  <input
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your Company Inc."
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Workspace Name</span>
                  <input
                    name="workspaceName"
                    required
                    value={formData.workspaceName}
                    onChange={handleChange}
                    placeholder="Your Workspace"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Password</span>
                  <input
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Confirm Password</span>
                  <input
                    name="confirmPassword"
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      passwordStrength <= 25
                        ? "bg-rose-500"
                        : passwordStrength <= 50
                        ? "bg-orange-500"
                        : passwordStrength <= 75
                        ? "bg-amber-500"
                        : "bg-sky-600"
                    }`}
                    style={{ width: `${passwordStrength}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Password strength: {passwordStrength >= 75 ? "Strong" : passwordStrength >= 50 ? "Good" : "Weak"}
                </p>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-700">
                <input type="checkbox" id="terms" className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                <label htmlFor="terms" className="text-slate-600">
                  I agree to the ZoikoVertex <Link href="/terms" className="font-semibold text-slate-950 underline">Terms of Service</Link> and <Link href="/privacy" className="font-semibold text-slate-950 underline">Privacy Policy</Link>.
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Create Workspace
              </button>

              <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <button className="inline-flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100">
                <Mail className="h-4 w-4" /> Continue with SSO
              </button>
            </form>

            <div className="mt-8 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Encrypted in transit and at rest</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Role-based access by design</span>
              </div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span>Enterprise-grade controls</span>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account? <Link href="/login" className="font-semibold text-slate-950 hover:text-slate-700">Sign in</Link>
            </p>
          </>
        ) : (
          <div className="space-y-6 rounded-[28px] border border-slate-200/70 bg-slate-50 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-700 shadow-sm">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-950">Request Submitted</h2>
            <p className="text-sm leading-7 text-slate-600">
              Your organization <span className="font-semibold text-slate-950">{formData.companyName}</span> is awaiting <span className="font-semibold text-slate-900">Workspace Owner Approval</span>. You will receive an email once your workspace is activated.
            </p>
            <Link href="/login" className="inline-flex w-full items-center justify-center rounded-3xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
