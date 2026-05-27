"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Building2, Layers, ArrowRight, Loader2,
  LogOut, ShieldCheck, Users, Zap,
  Globe, Rocket, TrendingUp, Crown, CheckCircle2, ArrowUpRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import WorkspaceSetupScreen from "@/components/WorkspaceSetupScreen";

/* ─── Perks (onboarding form) ────────────────────────────────────────────── */
const PERKS = [
  { icon: ShieldCheck, text: "You become Workspace Owner with full control" },
  { icon: Users,       text: "Invite your team after setup — any size" },
  { icon: Zap,         text: "Free plan to start — upgrade any time" },
];

/* ─── Plans (matches billing page exactly) ───────────────────────────────── */
const WELCOME_PLANS = [
  {
    id:         "starter",
    name:       "Vertex Starter",
    price:      "$0",
    period:     "",
    annualNote: "",
    desc:       "Connect channels and understand your social governance posture.",
    icon:       Globe,
    features:   ["2 users · 2 social profiles", "1 workspace & 1 brand", "Analytics snapshot + basic activity log", "Email & help center support"],
    limits:     "No publishing or approval workflows",
    cta:        "Continue Free",
    kind:       "free" as const,
    highlight:  false,
  },
  {
    id:         "growth",
    name:       "Vertex Growth",
    price:      "$399",
    period:     "/mo",
    annualNote: "$299/mo billed annually",
    desc:       "Run governed campaigns with AI, approvals, and audit-ready execution.",
    icon:       Rocket,
    features:   ["7 users · 8 social profiles", "5 AI agents (standard governed)", "Full Campaigns, Review Queue & Approvals", "Immutable audit trail · Priority support"],
    limits:     "",
    cta:        "Select Growth",
    kind:       "upgrade" as const,
    highlight:  true,
    badge:      "Popular",
  },
  {
    id:         "scale",
    name:       "Vertex Scale",
    price:      "$999",
    period:     "/mo",
    annualNote: "$799/mo billed annually",
    desc:       "Coordinate multi-brand teams with advanced governance intelligence.",
    icon:       TrendingUp,
    features:   ["20 users · 25 social profiles", "Up to 5 brands/workspaces", "Crisis Console + Full Brand Library", "Named Customer Success Manager"],
    limits:     "",
    cta:        "Select Scale",
    kind:       "upgrade" as const,
    highlight:  false,
  },
  {
    id:         "corporate",
    name:       "Vertex Corporate",
    price:      "Custom",
    period:     "",
    annualNote: "Annual contract",
    desc:       "Custom governance architecture for regulated enterprise deployment.",
    icon:       Crown,
    features:   ["Custom users & profiles", "Three-key approval protocol", "Evidence Vault + legal hold", "TAM + AE + agreed SLA"],
    limits:     "",
    cta:        "Contact Sales",
    kind:       "contact" as const,
    highlight:  false,
  },
] as const;

type PlanKind = typeof WELCOME_PLANS[number]["kind"];

/* ─── Particle positions (fixed to avoid hydration mismatch) ────────────── */
const DOTS = [
  { l:"4%",  t:"30%", d:"0s",   dur:"8s"   },
  { l:"12%", t:"65%", d:"1.6s", dur:"6.5s" },
  { l:"24%", t:"45%", d:"0.8s", dur:"9s"   },
  { l:"38%", t:"80%", d:"2.4s", dur:"7s"   },
  { l:"55%", t:"25%", d:"0.3s", dur:"8.5s" },
  { l:"68%", t:"70%", d:"1.9s", dur:"6s"   },
  { l:"80%", t:"40%", d:"3.2s", dur:"7.5s" },
  { l:"91%", t:"60%", d:"0.6s", dur:"8s"   },
];

/* ─────────────────────────────────────────────────────────────────────────── *
 *  WelcomeScreen — shown once, immediately after workspace creation           *
 * ─────────────────────────────────────────────────────────────────────────── */
function WelcomeScreen({
  userName,
  workspaceName,
  onAction,
}: {
  userName:      string;
  workspaceName: string;
  onAction:      (kind: PlanKind, planId: string) => void;
}) {
  return (
    <>
      <style>{`
        @keyframes wFadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes wFloat {
          0%   { opacity:0;   transform:translateY(0); }
          20%  { opacity:0.5; }
          80%  { opacity:0.2; }
          100% { opacity:0;   transform:translateY(-100px); }
        }
        @keyframes wOrb {
          0%,100% { opacity:0.5; transform:scale(1); }
          50%      { opacity:0.8; transform:scale(1.1); }
        }
        .w-enter { animation: wFadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .w-card  { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .w-card:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(0,0,0,0.5); }
        .w-btn-white { transition: background 0.15s, color 0.15s; }
        .w-btn-white:hover { background: #e4e4e7 !important; }
        .w-btn-ghost { transition: color 0.15s, border-color 0.15s; }
        .w-btn-ghost:hover { color:#fff !important; border-color:#52525b !important; }
      `}</style>

      {/* Full-viewport, no scroll */}
      <div style={{
        height: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        padding: "0 24px",
        gap: 20,
      }}>

        {/* Orbs */}
        <div style={{ position:"absolute", top:-240, right:-180, width:640, height:640, borderRadius:"50%", background:"radial-gradient(circle, rgba(63,63,70,0.4) 0%, transparent 65%)", animation:"wOrb 10s ease-in-out infinite", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-280, left:-160, width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(39,39,42,0.5) 0%, transparent 65%)", animation:"wOrb 13s ease-in-out infinite 4s", pointerEvents:"none" }} />

        {/* Particles */}
        {DOTS.map((p, i) => (
          <div key={i} style={{ position:"absolute", left:p.l, top:p.t, width:3, height:3, borderRadius:"50%", background:"rgba(113,113,122,0.55)", animation:`wFloat ${p.dur} ease-in ${p.d} infinite`, pointerEvents:"none" }} />
        ))}

        {/* Content */}
        <div style={{ position:"relative", zIndex:10, width:"100%", maxWidth:1160, display:"flex", flexDirection:"column", alignItems:"center", gap:20 }}>

          {/* Heading */}
          <div className="w-enter" style={{ animationDelay:"70ms", textAlign:"center" }}>
            <h1 style={{ fontSize:"clamp(26px,3.5vw,38px)", fontWeight:800, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.1, margin:0 }}>
              Welcome, {userName.split(" ")[0]}
            </h1>
            <p style={{ fontSize:14, color:"#71717a", marginTop:8, marginBottom:0 }}>
              <span style={{ color:"#a1a1aa", fontWeight:600 }}>{workspaceName}</span>{" "}is live · You&apos;re the Workspace Owner
            </p>
          </div>

          {/* Section label */}
          <p className="w-enter" style={{ animationDelay:"140ms", fontSize:11, color:"#52525b", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.12em", margin:0 }}>
            Choose your plan to continue
          </p>

          {/* Plan grid */}
          <div className="w-enter" style={{ animationDelay:"240ms", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, width:"100%", alignItems:"stretch" }}>
            {WELCOME_PLANS.map(plan => {
              const Icon = plan.icon;
              return (
                <div key={plan.id} className="w-card" style={{
                  background: plan.highlight ? "#18181b" : "rgba(24,24,27,0.6)",
                  border: plan.highlight ? "1px solid #52525b" : "1px solid #27272a",
                  borderRadius: 14,
                  padding: "20px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0,
                  position: "relative",
                  boxShadow: plan.highlight ? "0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
                }}>
                  {/* Popular badge */}
                  {"badge" in plan && plan.badge && (
                    <div style={{ position:"absolute", top:-1, right:16, background:"#fff", borderRadius:"0 0 8px 8px", padding:"3px 10px" }}>
                      <span style={{ fontSize:9, fontWeight:800, color:"#09090b", letterSpacing:"0.08em" }}>POPULAR</span>
                    </div>
                  )}

                  {/* Icon + name */}
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:"#27272a", border:"1px solid #3f3f46", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <Icon style={{ width:16, height:16, color:"#a1a1aa" }} />
                    </div>
                    <div>
                      <p style={{ fontSize:13, fontWeight:700, color:"#fff", margin:0, lineHeight:1.2 }}>{plan.name}</p>
                      <div style={{ display:"flex", alignItems:"baseline", gap:2, marginTop:1 }}>
                        <span style={{ fontSize:18, fontWeight:800, color:"#fff", letterSpacing:"-0.03em" }}>{plan.price}</span>
                        {plan.period && <span style={{ fontSize:11, color:"#71717a" }}>{plan.period}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Annual note */}
                  {plan.annualNote && (
                    <p style={{ fontSize:10, color:"#52525b", margin:"0 0 10px 0" }}>{plan.annualNote}</p>
                  )}

                  {/* Description */}
                  <p style={{ fontSize:11, color:"#71717a", lineHeight:1.5, margin:"0 0 14px 0", flexGrow:0 }}>
                    {plan.desc}
                  </p>

                  {/* Features */}
                  <div style={{ borderTop:"1px solid #27272a", paddingTop:12, marginBottom:14, display:"flex", flexDirection:"column", gap:8, flex:1 }}>
                    {plan.features.map(f => (
                      <div key={f} style={{ display:"flex", alignItems:"flex-start", gap:7 }}>
                        <CheckCircle2 style={{ width:12, height:12, color:"#52525b", flexShrink:0, marginTop:1 }} />
                        <span style={{ fontSize:11, color:"#a1a1aa", lineHeight:1.4 }}>{f}</span>
                      </div>
                    ))}
                    {plan.limits && (
                      <p style={{ fontSize:10, color:"#3f3f46", margin:"4px 0 0 0", paddingLeft:19 }}>{plan.limits}</p>
                    )}
                  </div>

                  {/* CTA */}
                  {plan.kind === "free" ? (
                    <button
                      onClick={() => onAction("free", plan.id)}
                      className="w-btn-ghost"
                      style={{ width:"100%", padding:"9px 0", borderRadius:9, border:"1px solid #3f3f46", background:"transparent", color:"#71717a", fontSize:13, fontWeight:600, cursor:"pointer" }}
                    >
                      {plan.cta}
                    </button>
                  ) : plan.kind === "contact" ? (
                    <a
                      href="mailto:sales@zoikogroup.com?subject=Vertex Corporate Inquiry"
                      style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, width:"100%", padding:"9px 0", borderRadius:9, background:"#fff", color:"#09090b", fontSize:13, fontWeight:600, textDecoration:"none", boxSizing:"border-box" }}
                      className="w-btn-white"
                    >
                      {plan.cta} <ArrowUpRight style={{ width:12, height:12 }} />
                    </a>
                  ) : (
                    <button
                      onClick={() => onAction("upgrade", plan.id)}
                      className="w-btn-white"
                      style={{ width:"100%", padding:"9px 0", borderRadius:9, border:"none", background:"#fff", color:"#09090b", fontSize:13, fontWeight:600, cursor:"pointer" }}
                    >
                      {plan.cta}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p className="w-enter" style={{ animationDelay:"360ms", fontSize:11, color:"#3f3f46", margin:0 }}>
            No credit card required · Change plan anytime in Settings
          </p>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();

  const [companyName,   setCompanyName]   = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [wsEdited,      setWsEdited]      = useState(false);
  const [userName,      setUserName]      = useState("");
  const [userEmail,     setUserEmail]     = useState("");
  const [avatarUrl,     setAvatarUrl]     = useState("");

  const [loading,    setLoading]    = useState(false);
  const [checking,   setChecking]   = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error,      setError]      = useState("");
  // "form" → "setting_up" → "done"
  const [step, setStep] = useState<"form" | "setting_up" | "done">("form");

  /* ── Auth + workspace guard ─────────────────────────────────────────────── */
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user;
      if (!user) { router.replace("/login"); return; }

      setUserName(
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "there",
      );
      setUserEmail(user.email ?? "");
      setAvatarUrl(user.user_metadata?.avatar_url ?? "");

      const res = await api.get("/api/v1/user/context").catch(() => null);
      if (res?.success && res.data?.workspace_id) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  /* ── Auto-suggest workspace name ────────────────────────────────────────── */
  useEffect(() => {
    if (!wsEdited && companyName.trim()) {
      setWorkspaceName(`${companyName.trim()}'s Workspace`);
    }
  }, [companyName, wsEdited]);

  /* ── Sign out ────────────────────────────────────────────────────────────── */
  const handleSignOut = async () => {
    setSigningOut(true);
    try { localStorage.removeItem("zv_role_cache"); } catch {}
    await supabase.auth.signOut();
    router.replace("/login");
  };

  /* ── Block browser back once workspace creation starts ─────────────────── */
  useEffect(() => {
    if (step === "form") return;
    window.history.pushState(null, "", window.location.href);
    const block = () => window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, [step]);

  /* ── Poll until workspace is confirmed ready ────────────────────────────── */
  useEffect(() => {
    if (step !== "setting_up") return;
    let active = true;
    const poll = async () => {
      try {
        const res = await api.get("/api/v1/user/context").catch(() => null);
        if (!active) return;
        if (res?.success && res.data?.workspace_id) {
          setStep("done");
          return;
        }
      } catch {}
      if (active) setTimeout(poll, 3000);
    };
    setTimeout(poll, 2000);
    return () => { active = false; };
  }, [step]);

  /* ── Submit ──────────────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !workspaceName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/api/v1/onboarding/setup", {
        company_name:   companyName.trim(),
        workspace_name: workspaceName.trim(),
      });

      if (!res.success) {
        setError(res.data?.error || res.error || "Something went wrong. Please try again.");
        return;
      }

      try { localStorage.removeItem("zv_role_cache"); } catch {}
      setStep("setting_up");
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle plan selection from welcome screen ──────────────────────────── */
  const handleWelcomeAction = (kind: PlanKind, _planId: string) => {
    if (kind === "free") {
      router.replace("/dashboard");
    } else if (kind === "upgrade") {
      router.replace("/admin/billing");
    }
    // "contact" uses an <a href="mailto:"> directly
  };

  /* ── Spinner while checking ─────────────────────────────────────────────── */
  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  /* ── Workspace provisioning screen ─────────────────────────────────────── */
  if (step === "setting_up") {
    return <WorkspaceSetupScreen />;
  }

  /* ── Welcome + plan selection (workspace confirmed ready) ───────────────── */
  if (step === "done") {
    return (
      <WelcomeScreen
        userName={userName}
        workspaceName={workspaceName}
        onAction={handleWelcomeAction}
      />
    );
  }

  /* ── Main onboarding form ───────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-white text-black antialiased flex flex-col">

      {/* Top bar */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-neutral-100">
        <Image
          src="/images/logo-wordmark.svg"
          alt="ZoikoVertex"
          width={136}
          height={28}
          className="h-7 w-auto"
        />

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-200 bg-neutral-50">
            {avatarUrl ? (
              <Image src={avatarUrl} width={20} height={20} className="w-5 h-5 rounded-full object-cover" alt="" unoptimized />
            ) : (
              <div className="w-5 h-5 rounded-full bg-neutral-300 flex items-center justify-center text-[9px] font-bold text-white uppercase">
                {userName.charAt(0)}
              </div>
            )}
            <span className="text-xs font-medium text-neutral-700 max-w-[160px] truncate">
              {userEmail}
            </span>
          </div>

          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-600 hover:border-neutral-400 hover:text-black transition-all disabled:opacity-50"
          >
            {signingOut
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <LogOut className="w-3.5 h-3.5" />
            }
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[440px]">

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">1</span>
              </div>
              <span className="text-xs font-semibold text-black">Set up workspace</span>
            </div>
            <div className="flex-1 h-px bg-neutral-200" />
            <div className="flex items-center gap-1.5 opacity-40">
              <div className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center">
                <span className="text-[10px] font-semibold text-neutral-400">2</span>
              </div>
              <span className="text-xs font-semibold text-neutral-400">Dashboard</span>
            </div>
          </div>

          {/* Greeting */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-black leading-tight">
              Welcome, {userName.split(" ")[0]}
            </h1>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
              Before you enter, tell us about your organisation.
              This takes under 30 seconds.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                Company name
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm text-black placeholder:text-neutral-400 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-1.5">
                Workspace name
              </label>
              <div className="relative">
                <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={e => { setWorkspaceName(e.target.value); setWsEdited(true); }}
                  placeholder="Acme Workspace"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-neutral-200 bg-white text-sm text-black placeholder:text-neutral-400 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400 pl-1">
                You can rename this later in Workspace Settings.
              </p>
            </div>

            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-2.5">
              {PERKS.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-neutral-600">{text}</span>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !companyName.trim() || !workspaceName.trim()}
              className="w-full h-12 bg-black hover:bg-neutral-800 active:scale-[0.99] text-white text-sm font-bold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating workspace…
                </>
              ) : (
                <>
                  Continue to dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

          </form>

          <p className="mt-6 text-center text-[11px] text-neutral-400">
            By continuing you agree to ZoikoVertex&apos;s{" "}
            <a href="#" className="text-neutral-600 font-semibold hover:text-black underline underline-offset-2">Terms</a>
            {" "}and{" "}
            <a href="#" className="text-neutral-600 font-semibold hover:text-black underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </main>

      <footer className="px-6 py-4 border-t border-neutral-100 text-center">
        <p className="text-[11px] text-neutral-400">
          © {new Date().getFullYear()} ZoikoGroup Inc. · All rights reserved.
        </p>
      </footer>
    </div>
  );
}
