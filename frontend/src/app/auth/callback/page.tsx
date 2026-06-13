"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [step, setStep]     = useState<"loading" | "otp" | "verified">("loading");
  const [email, setEmail]   = useState("");
  const [otp, setOtp]       = useState(["", "", "", "", "", ""]);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const tryGetSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user?.email) {
        setEmail(session.user.email);
        await sendOtp(session.user.email);
        setStep("otp");
        return true;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!cancelled && user?.email) {
        setEmail(user.email);
        await sendOtp(user.email);
        setStep("otp");
        return true;
      }
      return false;
    };

    const poll = async () => {
      while (!cancelled && attempts < 10) {
        attempts++;
        const ok = await tryGetSession();
        if (ok) return;
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!cancelled) router.replace("/login");
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  const sendOtp = async (e: string) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      await fetch(`${backendUrl}/api/v1/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e.trim() }),
      });
    } catch {}
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...otp];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtp(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 6) { setError("Enter the full 6-digit code"); return; }
    setLoading(true);
    setError("");
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      const response = await fetch(`${backendUrl}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const res = await response.json().catch(() => ({}));
      if (response.status === 409 && res.exists) {
        await supabase.auth.signOut();
        document.cookie = "zv_auth=; path=/; SameSite=Strict; max-age=0";
        window.location.href = `/login?email=${encodeURIComponent(email.trim())}`;
        return;
      }
      if (response.ok && res.success) {
        document.cookie = "zv_otp_verified=1; path=/; SameSite=Lax; max-age=3600";
        window.location.href = "/onboarding";
      } else {
        setError(res.error || "Verification failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
      await fetch(`${backendUrl}/api/v1/auth/otp/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setResent(true);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => setResent(false), 3000);
      inputRefs.current[0]?.focus();
    } catch {}
    setLoading(false);
  };

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-cyan-400 animate-spin" />
        <p className="text-white/40 text-sm">Signing you in&hellip;</p>
      </div>
    );
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        {/* Email icon */}
        <div style={{
          width: "52px", height: "52px", borderRadius: "50%",
          background: "rgba(16, 80, 60, 0.7)",
          border: "1.5px solid rgba(34, 211, 197, 0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: "22px",
        }}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect x="2" y="5" width="18" height="13" rx="2.5" stroke="#20E7F2" strokeWidth="1.5"/>
            <path d="M2 8l9 6 9-6" stroke="#20E7F2" strokeWidth="1.5" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Label */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
          <div style={{ width: "20px", height: "1px", background: "#20E7F2" }} />
          <span style={{ fontSize: "10px", fontWeight: "600", letterSpacing: "2px", color: "#20E7F2", textTransform: "uppercase" }}>
            Verify your email
          </span>
          <div style={{ width: "20px", height: "1px", background: "#20E7F2" }} />
        </div>

        {/* Title */}
        <h2 style={{ fontSize: "26px", fontWeight: "700", color: "#f1f5f9", margin: "0 0 14px", letterSpacing: "-0.3px" }}>
          {step === "verified" ? "Email verified!" : "Check your inbox"}
        </h2>

        {/* Subtitle */}
        <p style={{ fontSize: "12.5px", color: "#64748b", textAlign: "center", lineHeight: "1.6", margin: "0 0 26px" }}>
          {step === "verified"
            ? "You're all set. Redirecting you now…"
            : <>We sent a 6-digit verification code to<br /><span style={{ color: "#cbd5e1", fontWeight: "500" }}>{email}</span></>}
        </p>

        {step !== "verified" && (
          <>
            {/* OTP inputs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "22px" }} onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text" inputMode="numeric" maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  style={{
                    width: "44px", height: "50px", background: "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${digit ? "rgba(32,231,242,0.6)" : "rgba(255,255,255,0.1)"}`,
                    borderRadius: "10px", color: "#f1f5f9", fontSize: "20px", fontWeight: "600",
                    textAlign: "center", outline: "none", caretColor: "#20E7F2", transition: "border-color 0.15s",
                  }}
                />
              ))}
            </div>

            {error && (
              <div style={{ marginBottom: "16px", padding: "12px 16px", background: "rgba(190,18,60,0.3)", borderRadius: "10px", border: "1px solid rgba(244,63,94,0.3)", width: "100%" }}>
                <p style={{ color: "#fb7185", fontSize: "12.5px", margin: "0" }}>{error}</p>
              </div>
            )}

            {/* Verify button */}
            <button onClick={handleVerify} disabled={loading}
              style={{
                width: "100%", padding: "14px",
                background: otp.join("").length === 6 ? "linear-gradient(90deg, #00d4c4 0%, #20E7F2 100%)" : "rgba(32,231,242,0.3)",
                border: "none", borderRadius: "10px",
                color: otp.join("").length === 6 ? "#0a1628" : "#64748b",
                fontSize: "15px", fontWeight: "700",
                cursor: loading ? "default" : otp.join("").length === 6 ? "pointer" : "default",
                letterSpacing: "0.2px", transition: "all 0.2s", marginBottom: "14px",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke={otp.join("").length === 6 ? "#0a1628" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Verify and continue</>
              )}
            </button>

            {/* Resend */}
            <p style={{ fontSize: "12px", color: "#475569", margin: "0 0 24px" }}>
              Didn't receive it?{" "}
              <span onClick={handleResend} style={{ color: resent ? "#20E7F2" : "#38bdf8", cursor: "pointer", fontWeight: "500" }}>
                {resent ? "Code sent!" : "Resend code"}
              </span>
            </p>

            {/* Change email */}
            <span onClick={async () => {
              await supabase.auth.signOut();
              document.cookie = "zv_auth=; path=/; SameSite=Strict; max-age=0";
              document.cookie = "zv_otp_verified=; path=/; SameSite=Strict; max-age=0";
              window.location.href = "/signup";
            }} style={{ fontSize: "12px", color: "#475569", cursor: "pointer", textDecoration: "underline", textDecorationColor: "rgba(71,85,105,0.3)" }}>
              Use a different email
            </span>
          </>
        )}

        {/* Success state */}
        {step === "verified" && (
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(16,80,60,0.6)", border: "2px solid #20E7F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "28px" }}>
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
              <path d="M5 13l6 6 10-11" stroke="#20E7F2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    </AuthLayout>
  );
}