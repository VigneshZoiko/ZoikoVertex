"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mail, ArrowRight, ArrowLeft, Loader2,
  Eye, EyeOff, Lock, User, Building2,

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

/* ΓöÇΓöÇ OTP input boxes ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...value];
    digits.forEach((d, i) => { next[i] = d; });
    onChange(next);
    const lastFilled = Math.min(digits.length, 5);
    refs.current[lastFilled]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5].map((idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKey(idx, e)}
          onPaste={idx === 0 ? handlePaste : undefined}
          className="w-[44px] h-[50px] bg-[rgba(255,255,255,0.06)] border text-center text-[20px] font-semibold text-[#f1f5f9] rounded-[10px] outline-none transition-colors"
          style={{ borderColor: value[idx] ? "rgba(32,231,242,0.6)" : "rgba(255,255,255,0.1)", caretColor: "#20E7F2" }}
        />
      ))}
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
  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  /* Resend countdown */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  /* OAuth */
  const handleOAuth = async (provider: "google" | "azure") => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPwd) { setError("Passwords do not match"); return; }
    if (strength < 3) { setError("Password too weak - add numbers and special characters"); return; }
    if (!agreedToS) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setLoading(true);
    try {
      // Public endpoint ΓÇö no auth token required, use raw fetch
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.status === 409 && res.exists) {
        router.push(`/login?email=${encodeURIComponent(email.trim())}`);
        return;
      }
      if (response.ok && res.success) {
        setStep(3);
        setResendTimer(60);
      } else {
        setError(res.error || `Failed to send code (${response.status})`);
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* Step 3 -> 4 (verify OTP, create account, sign in) */
  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setVerifyError("Enter the full 6-digit code"); return; }
    setVerifying(true);
    setVerifyError("");
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code,
          newPassword: password,
          fullName: `${firstName} ${lastName}`.trim(),
        }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        // Auth user was created at OTP verify — sign in with their chosen password
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) {
          setVerifyError("Account created but sign-in failed. Please try logging in.");
          return;
        }
        document.cookie = "zv_auth=1; path=/; SameSite=Lax; max-age=3600";
        window.location.href = `/onboarding`;
      } else {
        setVerifyError(res.error || "Verification failed. Please try again.");
      }
    } catch {
      setVerifyError("Network error. Please check your connection.");
    } finally {
      setVerifying(false);
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/auth/otp/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setResendTimer(60);
        setOtp(["", "", "", "", "", ""]);
      } else {
        setError(res.error || "Failed to resend code");
      }
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };
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
              <p className="text-[14px] text-white/45">Starting with Vertex Starter — free, no credit card needed.</p>
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
                  <path fill="#00a4ef" d="M11 1h9v9h-9z"/>
                  <path fill="#ffb900" d="M1 11h9v9H1z"/>
                  <path fill="#7cbb00" d="M11 11h9v9h-9z"/>
                </svg>
                Microsoft
              </button>
            </div>

            <StepDots current={1} total={4} />

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

            <StepDots current={2} total={4} />

            <p className="text-center text-[13px] text-white/40 mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </form>
        )}


        {/* STEP 3: OTP verification ── */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            {/* Email icon bubble */}
            <div style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              background: "rgba(16, 80, 60, 0.7)",
              border: "1.5px solid rgba(34, 211, 197, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "22px",
            }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect x="2" y="5" width="18" height="13" rx="2.5" stroke="#20E7F2" strokeWidth="1.5"/>
                <path d="M2 8l9 6 9-6" stroke="#20E7F2" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Label */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "10px",
            }}>
              <div style={{ width: "20px", height: "1px", background: "#20E7F2" }} />
              <span style={{
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "2px",
                color: "#20E7F2",
                textTransform: "uppercase",
              }}>
                Verify your email
              </span>
              <div style={{ width: "20px", height: "1px", background: "#20E7F2" }} />
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: "26px",
              fontWeight: "700",
              color: "#f1f5f9",
              margin: "0 0 14px",
              letterSpacing: "-0.3px",
            }}>
              {"Check your inbox"}
            </h2>

            {/* Subtitle */}
            <p style={{
              fontSize: "12.5px",
              color: "#64748b",
              textAlign: "center",
              lineHeight: "1.6",
              margin: "0 0 26px",
            }}>
              <>We sent a 6-digit verification code to<br /><span style={{ color: "#cbd5e1", fontWeight: "500" }}>{email}</span></>
            </p>

            <>
                {/* OTP inputs */}
                <div className="mb-[22px]">
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                {verifyError && (
                  <div style={{
                    marginBottom: "16px",
                    padding: "12px 16px",
                    background: "rgba(190,18,60,0.3)",
                    borderRadius: "10px",
                    border: "1px solid rgba(244,63,94,0.3)",
                    width: "100%",
                  }}>
                    <p style={{ color: "#fb7185", fontSize: "12.5px", margin: "0" }}>{verifyError}</p>
                  </div>
                )}

                {/* Verify button */}
                <button onClick={handleVerifyOtp} disabled={verifying}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: otp.join("").length === 6
                      ? "linear-gradient(90deg, #00d4c4 0%, #20E7F2 100%)"
                      : "rgba(32,231,242,0.3)",
                    border: "none",
                    borderRadius: "10px",
                    color: otp.join("").length === 6 ? "#0a1628" : "#64748b",
                    fontSize: "15px",
                    fontWeight: "700",
                    cursor: verifying ? "default" : otp.join("").length === 6 ? "pointer" : "default",
                    letterSpacing: "0.2px",
                    transition: "all 0.2s",
                    marginBottom: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke={otp.join("").length === 6 ? "#0a1628" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Verify and continue</>
                  )}
                </button>

                {/* Resend */}
                <p style={{
                  fontSize: "12px",
                  color: "#475569",
                  margin: "0",
                }}>
                  Didn&apos;t receive it?{" "}
                  {resendTimer > 0 ? (
                    <span style={{ color: "#64748b" }}>Resend in {resendTimer}s</span>
                  ) : (
                    <span onClick={handleResend} style={{ color: "#38bdf8", cursor: "pointer", fontWeight: "500" }}>
                      Resend code
                    </span>
                  )}
                </p>
              </>


            <StepDots current={3} total={4} />
            <p style={{ fontSize: "12.5px", color: "#475569", marginTop: "28px", marginBottom: "12px" }}>
              Already have an account?{" "}
              <Link href="/login" style={{ color: "#20E7F2", fontWeight: "500" }}>Sign in</Link>
            </p>
          </div>
        )}

        {/* STEP 4: no longer used — redirects to /onboarding */}
      </div>
    </AuthLayout>
  );
}

