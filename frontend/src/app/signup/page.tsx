"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail, ArrowRight, ArrowLeft, Loader2,
  Eye, EyeOff, Lock, User, Building2,
  CheckCircle2, LayoutDashboard, ChevronDown,
} from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

/* ── Shared styles ─────────────────────────────────────────────── */
const inputCls = "w-full rounded-xl border border-[#1E2F55] bg-[#0C1529] py-3.5 text-sm text-white/80 placeholder-white/20 outline-none transition focus:border-[#20E7F2]/50 focus:ring-1 focus:ring-[#20E7F2]/20";
const cyanBtn  = "w-full flex items-center justify-center gap-2.5 rounded-xl bg-[#20E7F2] py-3.5 text-sm font-bold text-[#080E1A] transition hover:bg-[#20E7F2]/90 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed";
const darkBtn  = "w-full flex items-center justify-center gap-2.5 rounded-xl border border-[#1E2F55] bg-[#0C1422] py-3.5 text-sm font-medium text-white/60 transition hover:text-white hover:bg-[#111D2E]";

const ROLES = [
  "Founder / CEO",
  "CMO / Marketing Director",
  "Marketing Manager",
  "Content Manager",
  "Agency Owner",
  "Agency Account Manager",
  "Enterprise Marketing Lead",
  "Other",
];

/* ── Step dot indicator ────────────────────────────────────────── */
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      {Array.from({ length: total }).map((_, i) => {
        const done   = i < current - 1;
        const active = i === current - 1;
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

/* ── OTP boxes ─────────────────────────────────────────────────── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...value];
    next[idx] = digit;
    onChange(next);
    if (digit && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...value];
    digits.forEach((d, i) => { next[i] = d; });
    onChange(next);
    refs.current[Math.min(digits.length, 5)]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {value.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKey(idx, e)}
          onPaste={handlePaste}
          className="h-14 w-11 rounded-xl border border-[#1E2F55] bg-[#0C1529] text-center text-xl font-bold text-white/90 outline-none transition focus:border-[#20E7F2]/60 focus:ring-1 focus:ring-[#20E7F2]/20 caret-[#20E7F2]"
        />
      ))}
    </div>
  );
}

/* ── Social icons ──────────────────────────────────────────────── */
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

/* ── Main component ─────────────────────────────────────────────── */
export default function SignupPage() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  /* Step 1 */
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [company, setCompany]     = useState("");

  /* Step 2 */
  const [password, setPassword]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showPwd, setShowPwd]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole]             = useState("");
  const [agreedToS, setAgreedToS]   = useState(false);

  /* Step 3 */
  const [otp, setOtp]             = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);
  const [verifyError, setVerifyError] = useState("");

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  /* ── OAuth ── */
  const handleOAuth = async (provider: "google" | "azure") => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
  };

  /* ── Step 1 → 2 ── */
  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  /* ── Step 2 → 3 ── */
  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPwd) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!agreedToS) { setError("Please agree to the Terms of Service and Privacy Policy"); return; }
    setLoading(true);
    try {
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
          role,
        }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setStep(3);
        setResendTimer(60);
      } else {
        setError(res.error || res.message || `Signup failed (${response.status}). Please try again.`);
      }
    } catch (err: any) {
      setError(err.message || "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Step 3 verify ── */
  const handleVerify = async () => {
    setVerifyError("");
    setLoading(true);
    try {
      const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (session) {
        document.cookie = "zv_auth=1; path=/; SameSite=Strict; max-age=3600";
        setStep(4);
      } else {
        setVerifyError("Unexpected verification state. Please try again.");
      }
    } catch (err: any) {
      const msg = err.message || "Unknown error";
      if (msg.includes("Email not confirmed")) {
        setVerifyError("Please check your inbox and click the verification link before continuing.");
      } else {
        setVerifyError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/users/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.ok && res.success) {
        setResendTimer(60);
      } else {
        setError(res.error || res.message || "Failed to resend verification email");
      }
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-[420px]">
        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
            {error}
          </div>
        )}

        {/* ── STEP 1: Basic info ── */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div className="mb-7">
              <h1 className="text-[1.75rem] font-black text-white/90 mb-1.5">Start for free</h1>
              <p className="text-[13px] text-white/45">Starting with Vertex Starter — free, no credit card needed.</p>
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

            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com" className={`${inputCls} pl-11 pr-4`} />
              </div>
            </div>

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

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">or continue with</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => handleOAuth("google")} disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60">
                <GoogleIcon /> Google
              </button>
              <button type="button" onClick={() => handleOAuth("azure")} disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#1E2F55] bg-[#0C1422] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-[#111D2E] hover:text-white disabled:opacity-60">
                <MicrosoftIcon /> Microsoft
              </button>
            </div>

            <StepDots current={1} total={3} />

            <p className="text-center text-[13px] text-white/40">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </form>
        )}

        {/* ── STEP 2: Password + role ── */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-5">
            <div className="mb-7">
              <h1 className="text-[1.75rem] font-black text-white/90 mb-1.5">Set your password</h1>
              <p className="text-[13px] text-white/45">Choose a strong password for your governed workspace.</p>
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
              <p className="text-[11px] text-white/30">Min. 8 characters, one number, one special character</p>
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

            {/* Role */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Your Role</label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className={`${inputCls} pl-11 pr-10 appearance-none cursor-pointer`}
                  style={{ color: role ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.2)" }}
                >
                  <option value="" disabled style={{ color: "#555" }}>Select your role</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r} style={{ color: "#fff", background: "#0C1529" }}>{r}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
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

            <p className="text-center text-[13px] text-white/40">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </form>
        )}

        {/* ── STEP 3: Verify email ── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Green email icon */}
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25">
                <Mail className="h-7 w-7 text-emerald-400" />
              </div>

              <div>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="h-px w-5 bg-[#20E7F2]" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#20E7F2]">Verify your email</span>
                  <div className="h-px w-5 bg-[#20E7F2]" />
                </div>
                <h2 className="text-[1.75rem] font-black text-white/90 mb-2">Check your inbox</h2>
                <p className="text-[13px] text-white/45 leading-relaxed">
                  We sent a verification link to<br />
                  <span className="text-white/70 font-semibold">{email}</span>
                </p>
              </div>
            </div>

            {/* OTP boxes */}
            <OtpInput value={otp} onChange={setOtp} />

            {verifyError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-400 text-center">
                {verifyError}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading}
              className={cyanBtn}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><CheckCircle2 className="h-4 w-4" /> Verify and continue</>
              }
            </button>

            <p className="text-center text-[13px] text-white/40">
              Didn&apos;t receive it?{" "}
              {resendTimer > 0
                ? <span className="text-white/30">Resend in {resendTimer}s</span>
                : (
                  <button type="button" onClick={handleResend} disabled={loading}
                    className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition disabled:opacity-50">
                    Resend code
                  </button>
                )
              }
            </p>

            <StepDots current={3} total={3} />

            <p className="text-center text-[13px] text-white/40">
              Already have an account?{" "}
              <Link href="/login" className="text-[#20E7F2] font-semibold hover:text-[#20E7F2]/80 transition">Sign in</Link>
            </p>
          </div>
        )}

        {/* ── STEP 4: Welcome ── */}
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
            <button onClick={() => router.push("/dashboard")} className={cyanBtn}>
              <LayoutDashboard className="h-4 w-4" /> Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
