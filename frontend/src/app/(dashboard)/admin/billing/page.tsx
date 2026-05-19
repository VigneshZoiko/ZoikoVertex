"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Zap, ShieldCheck, CheckCircle2,
  ArrowRight, Crown, Building2, Layers,
  Clock, Download, Sliders, Users, Globe,
  Database, DollarSign, Lock, AlertTriangle,
  Loader2, RefreshCw, BarChart3, Activity,
  FileText, ChevronRight
} from "lucide-react";
import { api } from "@/lib/api";

interface UsageSummaryItem {
  quantity: number;
  cost: number;
  unit: string;
}

const PLANS = [
  {
    id: "starter",
    name: "Vertex Starter",
    price: "$0",
    annual: null,
    period: "/ month",
    desc: "Start with visibility. Connect limited channels and understand your social governance posture.",
    cta: "Start Free",
    color: "text-slate-400",
    border: "border-slate-800",
    activeBorder: "border-slate-500",
    badge: null,
    features: [
      "2 users",
      "2 connected social profiles",
      "1 workspace & 1 brand",
      "AI agent preview only",
      "Analytics snapshot",
      "Basic activity log",
      "30-day data retention",
      "Email & help center support",
    ],
    limits: ["No live publishing", "No approval workflows", "No Brand Library", "No Crisis Console"],
  },
  {
    id: "growth",
    name: "Vertex Growth",
    price: "$399",
    annual: "$299",
    period: "/ month",
    desc: "Run governed campaigns with AI-assisted content, approvals, publishing, and audit-ready execution.",
    cta: "Start 14-Day Trial",
    color: "text-indigo-400",
    border: "border-indigo-900",
    activeBorder: "border-indigo-500",
    badge: null,
    features: [
      "7 included users",
      "8 connected social profiles",
      "1 brand workspace",
      "5 AI agents (standard governed mode)",
      "Full Campaigns & Content Studio",
      "Review Queue, Validation & Approvals",
      "Standard Inbox / Engagement",
      "Immutable audit trail + export controls",
      "12-month data retention",
      "Priority email support",
    ],
    limits: ["No multi-brand portfolio", "No Crisis Console", "No legal hold", "No SSO/SCIM"],
  },
  {
    id: "scale",
    name: "Vertex Scale",
    price: "$999",
    annual: "$799",
    period: "/ month",
    desc: "Coordinate multi-brand teams with advanced approvals, governed agents, and cross-brand performance intelligence.",
    cta: "Book Strategy Call",
    color: "text-cyan-400",
    border: "border-cyan-900",
    activeBorder: "border-cyan-500",
    badge: "Most Popular",
    features: [
      "20 included users",
      "25 connected social profiles",
      "Up to 5 brands / workspaces",
      "5 AI agents (advanced governed mode)",
      "Advanced multi-stage approvals + multi-key",
      "Full Brand Library",
      "Crisis Console (standard)",
      "Advanced evidence packaging",
      "24-month data retention",
      "Named Customer Success Manager",
    ],
    limits: ["No full legal hold", "No dedicated environment", "No custom SLA credits"],
  },
  {
    id: "corporate",
    name: "Vertex Corporate",
    price: "Custom",
    annual: null,
    period: "pricing",
    desc: "Deploy across corporate brands, regulated workflows, executive oversight, and custom governance architecture.",
    cta: "Request Corporate Brief",
    color: "text-amber-400",
    border: "border-amber-900",
    activeBorder: "border-amber-500",
    badge: "Enterprise",
    features: [
      "Custom users & profiles",
      "Custom multi-entity workspaces",
      "5 AI agents (custom-governed)",
      "Three-key approval protocol",
      "Evidence Vault + legal hold",
      "Full Crisis Console",
      "SSO / SAML / SCIM",
      "Custom data retention",
      "DPA & sub-processor list",
      "TAM + AE + agreed SLA",
    ],
    limits: [],
  },
];

const MATRIX_ROWS = [
  { label: "Users included", vals: ["2", "7", "20", "Custom"] },
  { label: "Social profiles", vals: ["2 (limited)", "8", "25", "Custom"] },
  { label: "Brands / workspaces", vals: ["1", "1", "Up to 5", "Custom"] },
  { label: "Production publishing", vals: [false, true, true, true] },
  { label: "AI agents", vals: ["Preview", "5 standard", "5 advanced", "5 custom"] },
  { label: "Content Studio", vals: [false, true, true, true] },
  { label: "Review Queue", vals: [false, true, true, true] },
  { label: "Approvals", vals: [false, "Standard", "Advanced / multi-key", "Three-key protocol"] },
  { label: "Brand Library", vals: [false, "Basic", "Full", "Advanced / multi-entity"] },
  { label: "Crisis Console", vals: [false, false, "Standard", "Full"] },
  { label: "Audit & Evidence", vals: ["Basic log", "Standard immutable", "Advanced packaging", "Evidence Vault + legal hold"] },
  { label: "SSO / SAML / SCIM", vals: [false, false, "Optional add-on", true] },
  { label: "Data retention", vals: ["30 days", "12 months", "24 months", "Custom"] },
  { label: "Support", vals: ["Email / help center", "Priority email", "Named CSM", "TAM + AE + SLA"] },
];

export default function BillingPage() {
  const [activePlan] = useState("corporate");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [summary, setSummary] = useState<Record<string, UsageSummaryItem>>({});
  const [loadingUsage, setLoadingUsage] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      setLoadingUsage(true);
      try {
        const ctx = await api.get("/api/v1/user/context");
        if (ctx.success && ctx.data?.workspace_id) {
          const res = await api.get(`/api/v1/monitoring/usage?workspaceId=${ctx.data.workspace_id}`);
          if (res.success) setSummary(res.data?.summary || {});
        }
      } catch { /* silent */ }
      finally { setLoadingUsage(false); }
    };
    fetchUsage();
  }, []);

  const totalCost = Object.values(summary).reduce((a, b) => a + b.cost, 0);

  const getPrice = (plan: typeof PLANS[0]) => {
    if (plan.annual && billingCycle === "annual") return plan.annual;
    return plan.price;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-16 pb-32">

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <CreditCard className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Licensing & Usage</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter">Billing & Plan Access</h1>
          <p className="text-zinc-500 mt-1 font-medium">Governed execution platform pricing · Role access · Dashboard surfaces</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-5 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest">Vertex Corporate Active</span>
          </div>
        </div>
      </div>

      {/* Billing Cycle Toggle */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${billingCycle === "monthly" ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800"}`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("annual")}
          className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${billingCycle === "annual" ? "bg-indigo-600 text-white" : "bg-zinc-900 text-zinc-500 hover:text-white border border-zinc-800"}`}
        >
          Annual
          <span className="ml-2 text-emerald-400">Save ~25%</span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {PLANS.map((plan) => {
          const isActive = plan.id === activePlan;
          return (
            <div
              key={plan.id}
              className={`bg-zinc-950 border ${isActive ? plan.activeBorder + " shadow-[0_0_40px_rgba(99,102,241,0.08)]" : plan.border} rounded-3xl p-8 flex flex-col gap-6 relative transition-all`}
            >
              {plan.badge && (
                <div className={`absolute -top-3 left-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${plan.id === "scale" ? "bg-cyan-500 text-black" : "bg-amber-500 text-black"}`}>
                  {plan.badge}
                </div>
              )}
              {isActive && (
                <div className="absolute -top-3 right-6 px-3 py-1 bg-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest text-white">
                  Active Plan
                </div>
              )}

              <div className="space-y-1">
                <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${plan.color}`}>{plan.name}</div>
                <div className="text-3xl font-black text-white tracking-tighter">
                  {getPrice(plan)}
                  {plan.price !== "Custom" && (
                    <span className="text-xs text-zinc-500 font-medium tracking-normal ml-1">{plan.period}</span>
                  )}
                </div>
                {plan.annual && billingCycle === "annual" && (
                  <div className="text-[10px] text-emerald-500 font-bold">Billed annually</div>
                )}
                <p className="text-[11px] text-zinc-500 leading-relaxed mt-2">{plan.desc}</p>
              </div>

              <div className="space-y-2.5 flex-1">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-zinc-300 leading-snug">{f}</span>
                  </div>
                ))}
                {plan.limits.map((l, j) => (
                  <div key={j} className="flex items-start gap-2.5 opacity-40">
                    <Lock className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-0.5" />
                    <span className="text-[11px] text-zinc-500 leading-snug">{l}</span>
                  </div>
                ))}
              </div>

              <button className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 cursor-default"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600"
              }`}>
                {isActive ? "Current Plan" : plan.cta}
                {!isActive && <ChevronRight className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Live Usage Metrics */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-black text-white tracking-tighter">Live Usage Metrics</h2>
          </div>
          {loadingUsage && <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* AI Tokens */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-500">
                <Zap className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Intelligence</span>
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">AI Tokens Consumed</div>
              <div className="text-3xl font-black text-white tracking-tighter">
                {loadingUsage ? "—" : (summary["AI_TOKENS"]?.quantity?.toLocaleString() || "0")}
                <span className="text-xs text-zinc-600 font-medium ml-1">tokens</span>
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">
                Est. cost: <span className="text-amber-500">${loadingUsage ? "—" : (summary["AI_TOKENS"]?.cost?.toFixed(4) || "0.0000")}</span>
              </div>
            </div>
          </div>

          {/* Social API Calls */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-500">
                <Globe className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Execution</span>
            </div>
            <div>
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Social API Calls</div>
              <div className="text-3xl font-black text-white tracking-tighter">
                {loadingUsage ? "—" : (summary["SOCIAL_API_CALLS"]?.quantity?.toLocaleString() || "0")}
                <span className="text-xs text-zinc-600 font-medium ml-1">calls</span>
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">
                Est. cost: <span className="text-indigo-400">${loadingUsage ? "—" : (summary["SOCIAL_API_CALLS"]?.cost?.toFixed(4) || "0.0000")}</span>
              </div>
            </div>
          </div>

          {/* Total Spend */}
          <div className="bg-indigo-600 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="relative z-10 space-y-1">
              <div className="p-2.5 bg-white/10 rounded-xl w-fit text-white mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Total Operational Spend</div>
              <div className="text-4xl font-black text-white tracking-tighter">
                {loadingUsage ? "—" : `$${totalCost.toFixed(4)}`}
              </div>
              <div className="text-[10px] text-indigo-300">
                Est. monthly burn: <span className="text-white font-black">{loadingUsage ? "—" : `$${(totalCost * 30).toFixed(2)}`}</span>
              </div>
            </div>
            <button className="mt-6 w-full py-3 bg-white text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
              <Download className="w-3.5 h-3.5" /> Export Cost Report
            </button>
          </div>
        </div>

        {/* Storage */}
        <div className="mt-6 bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-white uppercase tracking-widest">Storage Consumption</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span>Knowledge / Vector Storage</span>
                <span className="text-white">{loadingUsage ? "—" : `${summary["STORAGE_MB"]?.quantity?.toFixed(1) || "0"} MB`}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: loadingUsage ? "0%" : `${Math.min(100, ((summary["STORAGE_MB"]?.quantity || 0) / 500) * 100)}%` }} />
              </div>
              <div className="text-[9px] text-zinc-600">Custom limit under Corporate plan</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <span>Media Asset Blob Storage</span>
                <span className="text-white">{loadingUsage ? "—" : `${((summary["STORAGE_MB"]?.quantity || 0) * 0.1).toFixed(2)} GB`}</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: "8%" }} />
              </div>
              <div className="text-[9px] text-zinc-600">Custom limit under Corporate plan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Access Matrix */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-black text-white tracking-tighter">Plan Capability Matrix</h2>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest w-48">Capability</th>
                  {PLANS.map(p => (
                    <th key={p.id} className={`text-center p-4 text-[10px] font-black uppercase tracking-widest ${p.id === activePlan ? p.color : "text-zinc-600"}`}>
                      {p.id === activePlan ? "★ " : ""}{p.name.replace("Vertex ", "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4 text-[11px] font-bold text-zinc-400">{row.label}</td>
                    {row.vals.map((val, j) => (
                      <td key={j} className="p-4 text-center">
                        {val === true ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : val === false ? (
                          <span className="text-zinc-700 text-lg">—</span>
                        ) : (
                          <span className={`text-[10px] font-bold ${j === 3 && PLANS[3].id === activePlan ? "text-amber-400" : j === PLANS.findIndex(p => p.id === activePlan) ? "text-indigo-300" : "text-zinc-500"}`}>
                            {val as string}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payment & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Payment Method */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Payment Method</h3>
          </div>
          <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black text-white">Corporate Invoice</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Annual contract · Auto-renew</div>
              </div>
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowRight className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
          <button className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border border-zinc-800">
            Manage Billing Portal
          </button>
        </div>

        {/* Invoices & Audit */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Invoices & Audit Exports</h3>
          </div>
          <div className="space-y-3">
            {["May 2025", "Apr 2025", "Mar 2025"].map((month, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800/60 transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-zinc-600" />
                  <div>
                    <div className="text-xs font-black text-white">{month} — Corporate Invoice</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">Annual contract · PDF</div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-zinc-600 text-center">Full audit ledger exports available in the Evidence Vault</p>
        </div>
      </div>

      {/* Policy Alert */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 flex items-center gap-4">
        <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
        <div>
          <div className="text-xs font-black text-emerald-400 uppercase tracking-widest">Corporate Plan Active — No Quota Limits</div>
          <p className="text-xs text-emerald-500/60 mt-0.5">Your plan has custom limits. Contact your Account Executive or TAM for entitlement review.</p>
        </div>
      </div>

    </div>
  );
}
