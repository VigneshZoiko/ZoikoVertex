"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail, ArrowRight, ArrowLeft, Loader2,
  Eye, EyeOff, Lock, User, Building2,
  CheckCircle2, LayoutDashboard,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
// Note: supabaseAdmin is only available on the backend, for frontend we'll use a different approach
// We'll call a backend endpoint to resend verification emails

/* ΓöÇΓöÇ Password strength ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function calcStrength(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8)            s++;
  if (/[A-Z]/.test(pwd))          s++;
  if (/[0-9]/.test(pwd))          s++;
  if (/[^A-Za-z0-9]/.test(pwd))   s++;
  return s;
}

const STRENGTH_COLORS = ["bg-rose-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400"];

/* ΓöÇΓöÇ Step dot indicator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: total }).map((_, i) => {
        const done    = i < current - 1;
        const active  = i === current - 1;
        return (
          <div
            key={i}
            className={[
              "rounded-full transition-all duration-300",
              done   ? "w-2.5 h-2.5 bg-emerald-400" :
              active ? "w-6 h-2.5 bg-[#20E7F2]" :
                       "w-2.5 h-2.5 bg-white/20",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}


/* ΓöÇΓöÇ Main component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  /* Step 1 */
  const [firstName, setFirstName]   = useState("");
  const [lastName, setLastName]     = useState("");
  const [email, setEmail]           = useState("");
  const [company, setCompany]       = useState("");

  /* Step 2 */
  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreedToS, setAgreedToS]   = useState(false);
  const strength                    = calcStrength(password);

  /* Step 3 */
  const [resendTimer, setResendTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  /* Resend countdown */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  /* ΓöÇΓöÇ OAuth ΓöÇΓöÇ */
  const handleOAuth = async (provider: "google" | "azure") => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  /* ΓöÇΓöÇ Step 1 ΓåÆ 2 ΓöÇΓöÇ */
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  /* ΓöÇΓöÇ Step 2 ΓåÆ 3 (call backend) ΓöÇΓöÇ */
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPwd) { setError("Passwords do not match"); return; }
    if (strength < 3) { setError("Password too weak ΓÇö add numbers and special characters"); return; }
    if (!agreedToS) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setLoading(true);
    try {
      // Public endpoint ΓÇö no auth token required, use raw fetch
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/auth/signup-enterprise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: `${firstName} ${lastName}`.trim(),
          workEmail: email,
          companyName: company,
          workspaceName: company,
          password,
        }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setStep(3);
        setResendTimer(60);
      } else {
        const msg = res.error || res.message || `Signup failed (${response.status}). Please try again.`;
        setError(msg);
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ΓöÇΓöÇ Step 3 ΓåÆ 4 (sign in to check if email is verified) ΓöÇΓöÇ */
  const handleVerifyFromEmail = async () => {
    setVerifying(true);
    setVerifyError("");
    setLoading(true);
    try {
      // Try to sign in with email/password - if email is verified, this will succeed
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) throw signInError;

      if (session) {
        // Sign in successful - email is verified
        document.cookie = "zv_auth=1; path=/; SameSite=Strict; max-age=3600";
        setStep(4);
      } else {
        // This shouldn't happen if there's no error, but handle just in case
        setVerifyError("Unexpected verification state. Please try again.");
      }
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("Email not confirmed")) {
        setVerifyError("Please check your inbox and click the verification link before continuing.");
      } else if (msg.includes("Invalid login credentials")) {
        setVerifyError("Invalid email or password. Please try again.");
      } else {
        setVerifyError(msg);
      }
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      // Public endpoint ΓÇö no auth token required, use raw fetch
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/users/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
        }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setResendTimer(60);
      } else {
        const msg = res.error || res.message || `Failed to resend verification email (${response.status})`;
        setError(msg);
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ΓöÇΓöÇ Input class ΓöÇΓöÇ */
  const inputCls = "w-full rounded-xl border border-[#1E2F55] bg-[#0C1529] py-3.5 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-[#20E7F2]/50 focus:ring-1 focus:ring-[#20E7F2]/20";
  const cyanBtn  = "w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#20E7F2] py-3.5 text-sm font-bold text-[#080E1A] transition hover:bg-[#20E7F2]/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
  const darkBtn  = "w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]";

  return (
    <AuthLayout>
      <div className="w-full max-w-[480px]">
        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* ΓöÇΓöÇ STEP 1: Basic info ΓöÇΓöÇ */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div className="mb-8">
              <h1 className="text-[1.75rem] font-black text-white/90 mb-1">Start for free</h1>
              <p className="text-[14px] text-white/45">Starting with Vertex Starter ΓÇö free, no credit card needed.</p>
            </div>

            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Sarah" className={`${inputCls} pl-11 pr-4`} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                    placeholder="Chen" className={`${inputCls} pl-11 pr-4`} />
                </div>
              </div>
            </div>

            {/* Work email */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com" className={`${inputCls} pl-11 pr-4`} />
              </div>
            </div>

            {/* Company name */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input type="text" required value={company} onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Corp" className={`${inputCls} pl-11 pr-4`} />
              </div>
            </div>

            <button type="submit" className={cyanBtn}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* OAuth */}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleOAuth("google")} disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>
              <button type="button" onClick={() => handleOAuth("azure")} disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60">
                <svg className="h-4 w-4" viewBox="0 0 21 21">
                  <path fill="#f25022" d="M1 1h9v9H1z"/>
                  <path fill="#00a4ef" d="M1 11h9v9H1z"/>
                  <path fill="#7fba00" d="M11 1h9v9h-9z"/>
                  <path fill="#ffb900" d="M11 11h9v9h-9z"/>
                </svg>
                Microsoft
              </button>
            </div>

            <StepDots current={1} total={3} />

            <p className="text-center text-[13px] text-white/40 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </form>
        )}

        {/* ΓöÇΓöÇ STEP 2: Password + role ΓöÇΓöÇ */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-5">
            <div className="mb-8">
              <h1 className="text-[1.75rem] font-black text-white/90 mb-1">Set your password</h1>
              <p className="text-[14px] text-white/45">Choose a strong password for your governed workspace.</p>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input type={showPwd ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className={`${inputCls} pl-11 pr-12`} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              <div className="flex gap-1 mt-1">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                    i < strength ? STRENGTH_COLORS[strength - 1] : "bg-white/10"
                  }`} />
                ))}
              </div>
              <p className="text-[11px] text-white/30 font-mono">Min. 8 characters, one number, one special character</p>
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input type={showConfirm ? "text" : "password"} required value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="Repeat your password"
                  className={`${inputCls} pl-11 pr-12`} />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition">
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* ToS checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreedToS} onChange={(e) => setAgreedToS(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-[#1E2F55] bg-[#0C1529] accent-[#20E7F2]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/40 leading-relaxed">
                I agree to the{" "}
                <Link href="/terms" className="underline text-[#20E7F2] hover:text-[#20E7F2]/80">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="underline text-[#20E7F2] hover:text-[#20E7F2]/80">Privacy Policy</Link>
              </span>
            </label>

            <button type="submit" disabled={loading} className={cyanBtn}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create Account <ArrowRight className="h-4 w-4" /></>}
            </button>

            <button type="button" onClick={() => { setStep(1); setError(""); }} className={darkBtn}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            <StepDots current={2} total={3} />

            <p className="text-center text-[13px] text-white/40 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </form>
        )}

        {/* ΓöÇΓöÇ STEP 3: Verify email ΓöÇΓöÇ */}
        {step === 3 && (
          <div className="text-center space-y-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-900/40 border border-blue-500/30">
              <Mail className="h-9 w-9 text-blue-400" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px w-5 bg-[#20E7F2]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20E7F2]">Email Verification</span>
                <div className="h-px w-5 bg-[#20E7F2]" />
              </div>
              <h2 className="text-[1.75rem] font-black text-white/90 mb-2">Check your inbox</h2>
              <p className="text-[14px] text-white/45">
                We&apos;ve sent a verification link to<br />
                <span className="text-white/70 font-semibold block">{email}</span>
                <span className="text-[12px] text-white/40 block mt-1">
                  Click the link in the email to verify your account, then click below
                </span>
              </p>

              {/* Verification error */}
              {verifyError && (
                <div className="mb-4 p-4 bg-rose-900/30 rounded-xl border border-rose-500/30">
                  <p className="text-rose-400">{verifyError}</p>
                </div>
              )}

              <div className="mt-6 space-y-4">
                <button
                  onClick={handleVerifyFromEmail}
                  disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> I&apos;ve Verified My Email</>}
                </button>

                <button
                  onClick={handleResend}
                  disabled={verifying || resendTimer > 0}
                  className="w-full flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-[0.2em] border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]"
                >
                  {resendTimer > 0 ? (
                    <span>Resend in {resendTimer}s</span>
                  ) : (
                    <>
                      <ArrowRight className="h-3 w-3" /> Resend verification email
                    </>
                  )}
                </button>
              </div>

              <p className="text-[13px] text-white/35 mt-4">
                Didn&apos;t receive the email?{" "}
                {resendTimer > 0 ? (
                  <span className="text-white/30">Please wait {resendTimer}s before resending</span>
                ) : (
                  <button type="button" onClick={handleResend} className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">
                    Resend verification email
                  </button>
                )}
              </p>
            </div>

            <StepDots current={3} total={3} />

            <p className="text-center text-[13px] text-white/40 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </div>
        )}

        {/* ΓöÇΓöÇ STEP 4: Welcome ΓöÇΓöÇ */}
        {step === 4 && (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-900/40 border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>

            <div>
              <div className="flex items-center justify-center gap-2 mb-3">
                <div className="h-px w-5 bg-[#20E7F2]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20E7F2]">You&apos;re in</span>
                <div className="h-px w-5 bg-[#20E7F2]" />
              </div>
              <h2 className="text-[1.75rem] font-black text-white/90 mb-3">Welcome to ZoikoVertex</h2>
              <p className="text-[14px] text-white/45 leading-relaxed">
                Your governed workspace is ready. Start with<br />
                the guided setup or go directly to the<br />
                Command Center.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => router.push("/dashboard")}
                className={cyanBtn}
              >
                <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
